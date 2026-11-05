import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { runPipeline, type PipelineInput, type PipelinePorts } from "../src/lib/pipeline";
import type { AudioStore, CallRecord, CallStatus, CallStore, Clock, MailPayload, Mailer, NewCallInput } from "../src/lib/ports";
import type { ExtractionClient } from "../src/lib/extract";
import type { TranscribeClient } from "../src/lib/transcribe";
import type { MessageCard } from "../src/lib/schema";
import { MessageCardSchema } from "../src/lib/schema";

function makeCallId(): string {
  return `call-${Math.random().toString(36).slice(2)}`;
}

type StoredCall = {
  id: string;
  ownerId: string;
  receivedAt: Date;
  status: CallStatus;
  callerIdNumber: string | null;
  transcript: string | null;
  transcriptLanguage: string | null;
  audioDeletedAt: Date | null;
  deliveredAt: Date | null;
  isSilentOrEmpty: boolean;
  extractionFailed: boolean;
};

type StoredCard = {
  callId: string;
  ownerId: string;
  card: MessageCard;
  receivedAt: Date;
};

function makeFakeCallStore(): CallStore & {
  calls: Map<string, StoredCall>;
  cards: Map<string, StoredCard>;
} {
  const calls = new Map<string, StoredCall>();
  const cards = new Map<string, StoredCard>();

  return {
    calls,
    cards,

    async insertCall(input: NewCallInput): Promise<string> {
      const id = makeCallId();
      calls.set(id, {
        id,
        ownerId: input.ownerId,
        receivedAt: input.receivedAt,
        status: "received",
        callerIdNumber: input.callerIdNumber,
        transcript: null,
        transcriptLanguage: null,
        audioDeletedAt: null,
        deliveredAt: null,
        isSilentOrEmpty: false,
        extractionFailed: false,
      });
      return id;
    },

    async updateStatus(callId: string, status: CallStatus): Promise<void> {
      const call = calls.get(callId);
      if (call) call.status = status;
    },

    async setTranscript(
      callId: string,
      transcript: string,
      language: string,
      isSilentOrEmpty: boolean,
    ): Promise<void> {
      const call = calls.get(callId);
      if (call) {
        call.transcript = transcript;
        call.transcriptLanguage = language;
        call.isSilentOrEmpty = isSilentOrEmpty;
      }
    },

    async setAudioDeletedAt(callId: string, at: Date): Promise<void> {
      const call = calls.get(callId);
      if (call) call.audioDeletedAt = at;
    },

    async setDeliveredAt(callId: string, at: Date): Promise<void> {
      const call = calls.get(callId);
      if (call) call.deliveredAt = at;
    },

    async insertCard(callId: string, ownerId: string, card: MessageCard, receivedAt: Date): Promise<void> {
      cards.set(callId, { callId, ownerId, card, receivedAt });
    },

    async readCall(callId: string): Promise<CallRecord | null> {
      return calls.get(callId) ?? null;
    },
  };
}

function makeFakeAudioStore(): AudioStore & { stored: Map<string, Buffer> } {
  const stored = new Map<string, Buffer>();
  return {
    stored,
    async put(callId: string, audio: Buffer): Promise<void> {
      stored.set(callId, audio);
    },
    async get(callId: string): Promise<Buffer> {
      const buf = stored.get(callId);
      if (!buf) throw new Error(`No audio for ${callId}`);
      return buf;
    },
    async delete(callId: string): Promise<void> {
      stored.delete(callId);
    },
  };
}

function makeFakeMailer(): Mailer & { sent: MailPayload[] } {
  const sent: MailPayload[] = [];
  return {
    sent,
    async send(payload: MailPayload): Promise<void> {
      sent.push(payload);
    },
  };
}

function makeFakeClock(start: Date = new Date("2026-11-05T12:00:00Z")): Clock {
  let current = start.getTime();
  return {
    now(): Date {
      current += 100;
      return new Date(current);
    },
  };
}

const VALID_CARD: MessageCard = {
  callerName: "Sarah",
  callbackNumber: "07700900123",
  reason: "The caller has a burst pipe.",
  urgency: "high",
  suggestedReply: "I will call you right back.",
  isSilentOrEmpty: false,
  extractionFailed: false,
};

function makeFakeTranscribeClient(
  result:
    | { ok: true; text: string; language: string }
    | { ok: false; message: string },
): TranscribeClient {
  return {
    async transcribe() {
      if (result.ok) {
        return { ok: true, value: { text: result.text, language: result.language } };
      }
      return { ok: false, error: { code: "api-error", message: result.message } };
    },
  };
}

function makeFakeExtractionClient(card: MessageCard): ExtractionClient {
  return {
    async complete() {
      return { content: JSON.stringify(card) };
    },
  };
}

function makePorts(
  overrides: Partial<PipelinePorts> & {
    callStore?: ReturnType<typeof makeFakeCallStore>;
    audioStore?: ReturnType<typeof makeFakeAudioStore>;
    mailer?: ReturnType<typeof makeFakeMailer>;
  } = {},
) {
  const callStore = overrides.callStore ?? makeFakeCallStore();
  const audioStore = overrides.audioStore ?? makeFakeAudioStore();
  const mailer = overrides.mailer ?? makeFakeMailer();
  const clock = overrides.clock ?? makeFakeClock();
  return { callStore, audioStore, mailer, clock, ...overrides };
}

const BASE_INPUT: PipelineInput = {
  audio: Buffer.alloc(1024, 0x80),
  ownerId: "owner-001",
  callerIdNumber: "+441234567890",
  notificationEmail: "owner@example.com",
};

describe("T20: full success path", () => {
  it("audio is deleted after transcription", async () => {
    const audioStore = makeFakeAudioStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ audioStore, transcribeClient, extractClient }));

    expect(audioStore.stored.size).toBe(0);
  });

  it("card is written to the call store", async () => {
    const callStore = makeFakeCallStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ callStore, transcribeClient, extractClient }));

    expect(callStore.cards.size).toBe(1);
    const [card] = [...callStore.cards.values()];
    expect(card).toBeDefined();
    if (card) {
      expect(card.card.callerName).toBe("Sarah");
    }
  });

  it("card has all required fields from MessageCardSchema", async () => {
    const callStore = makeFakeCallStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ callStore, transcribeClient, extractClient }));

    const [stored] = [...callStore.cards.values()];
    expect(stored).toBeDefined();
    if (stored) {
      const result = MessageCardSchema.safeParse(stored.card);
      expect(result.success).toBe(true);
    }
  });

  it("urgency is a valid enum value", async () => {
    const callStore = makeFakeCallStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ callStore, transcribeClient, extractClient }));

    const [stored] = [...callStore.cards.values()];
    expect(stored).toBeDefined();
    if (stored) {
      expect(["low", "normal", "high"]).toContain(stored.card.urgency);
    }
  });

  it("call status ends at delivered", async () => {
    const callStore = makeFakeCallStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ callStore, transcribeClient, extractClient }));

    const [call] = [...callStore.calls.values()];
    expect(call?.status).toBe("delivered");
  });

  it("notification email is sent", async () => {
    const mailer = makeFakeMailer();
    const transcribeClient = makeFakeTranscribeClient({
      ok: true,
      text: "Hi, I have a burst pipe.",
      language: "en",
    });
    const extractClient = makeFakeExtractionClient(VALID_CARD);

    await runPipeline(BASE_INPUT, makePorts({ mailer, transcribeClient, extractClient }));

    expect(mailer.sent.length).toBeGreaterThanOrEqual(1);
    expect(mailer.sent[0]?.to).toBe("owner@example.com");
  });
});

describe("T21: silent or empty audio path", () => {
  it("zero-byte input produces an all-unknown card with isSilentOrEmpty true", async () => {
    const callStore = makeFakeCallStore();
    const silentInput: PipelineInput = {
      ...BASE_INPUT,
      audio: Buffer.alloc(0),
    };

    await runPipeline(silentInput, makePorts({ callStore }));

    const [stored] = [...callStore.cards.values()];
    expect(stored).toBeDefined();
    if (stored) {
      expect(stored.card.isSilentOrEmpty).toBe(true);
      expect(stored.card.callerName).toBe("unknown");
      expect(stored.card.callbackNumber).toBe("unknown");
      expect(stored.card.reason).toBe("unknown");
    }
  });

  it("silent audio call ends in a terminal status", async () => {
    const callStore = makeFakeCallStore();
    const silentInput: PipelineInput = { ...BASE_INPUT, audio: Buffer.alloc(0) };

    await runPipeline(silentInput, makePorts({ callStore }));

    const [call] = [...callStore.calls.values()];
    const terminalStatuses: CallStatus[] = [
      "delivered",
      "extraction-failed",
      "transcription-failed",
    ];
    expect(terminalStatuses).toContain(call?.status);
  });

  it("sends a notification email for silent audio", async () => {
    const mailer = makeFakeMailer();
    const silentInput: PipelineInput = { ...BASE_INPUT, audio: Buffer.alloc(0) };

    await runPipeline(silentInput, makePorts({ mailer }));

    expect(mailer.sent.length).toBeGreaterThanOrEqual(1);
  });
});

describe("T22: transcription failure path", () => {
  it("mocked API error produces a transcription-failed call record", async () => {
    const callStore = makeFakeCallStore();
    const transcribeClient = makeFakeTranscribeClient({
      ok: false,
      message: "Whisper API timed out",
    });

    await runPipeline(BASE_INPUT, makePorts({ callStore, transcribeClient }));

    const [call] = [...callStore.calls.values()];
    expect(call?.status).toBe("transcription-failed");
  });

  it("sends a failure email when transcription fails", async () => {
    const mailer = makeFakeMailer();
    const transcribeClient = makeFakeTranscribeClient({
      ok: false,
      message: "Whisper API timed out",
    });

    await runPipeline(BASE_INPUT, makePorts({ mailer, transcribeClient }));

    expect(mailer.sent.length).toBeGreaterThanOrEqual(1);
    expect(mailer.sent[0]?.subject).toContain("failed");
  });

  it("failure email is sent to the notification address", async () => {
    const mailer = makeFakeMailer();
    const transcribeClient = makeFakeTranscribeClient({
      ok: false,
      message: "Whisper API timed out",
    });

    await runPipeline(BASE_INPUT, makePorts({ mailer, transcribeClient }));

    expect(mailer.sent[0]?.to).toBe("owner@example.com");
  });
});

describe("property: runPipeline never throws and always leaves a terminal status", () => {
  it("P: any random bytes and any fake model output end in a terminal status", async () => {
    const terminalStatuses: CallStatus[] = [
      "delivered",
      "extraction-failed",
      "transcription-failed",
    ];

    const arbitraryBuffer = fc.uint8Array({ minLength: 0, maxLength: 512 }).map(Buffer.from);
    const arbitraryCard = fc.record({
      callerName: fc.string({ minLength: 1 }),
      callbackNumber: fc.constantFrom("unknown"),
      reason: fc.string({ minLength: 1 }),
      urgency: fc.constantFrom("low", "normal", "high" as const),
      suggestedReply: fc.string({ minLength: 1 }),
      isSilentOrEmpty: fc.boolean(),
      extractionFailed: fc.boolean(),
    });

    await fc.assert(
      fc.asyncProperty(
        arbitraryBuffer,
        arbitraryCard,
        async (audioBytes, fakeCard) => {
          const callStore = makeFakeCallStore();
          const extractClient: ExtractionClient = {
            async complete() {
              return { content: JSON.stringify(fakeCard) };
            },
          };
          const transcribeClient: TranscribeClient = {
            async transcribe() {
              return {
                ok: true,
                value: { text: "test transcript", language: "en" },
              };
            },
          };

          let threw = false;
          try {
            await runPipeline(
              { ...BASE_INPUT, audio: audioBytes },
              makePorts({ callStore, transcribeClient, extractClient }),
            );
          } catch {
            threw = true;
          }

          if (threw) return false;

          const [call] = [...callStore.calls.values()];
          return call !== undefined && terminalStatuses.includes(call.status);
        },
      ),
      { numRuns: 50 },
    );
  });
});
