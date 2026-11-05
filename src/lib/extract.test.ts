import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import { extractCard, isCallbackNumberAllowed, type ExtractionClient } from "./extract";
import { MessageCardSchema } from "./schema";

function makeClientReturning(jsonPayload: unknown): ExtractionClient {
  return {
    async complete() {
      return { content: JSON.stringify(jsonPayload) };
    },
  };
}

const VALID_CARD_BASE = {
  callerName: "Test Caller",
  callbackNumber: "unknown",
  reason: "Test reason.",
  urgency: "normal" as const,
  suggestedReply: "I will call you back.",
  isSilentOrEmpty: false,
  extractionFailed: false,
};

const arbitraryTranscript = fc.string({ minLength: 0, maxLength: 200 });

const arbitraryUrgency = fc.constantFrom("low", "normal", "high" as const);

describe("isCallbackNumberAllowed (unit)", () => {
  it("allows 'unknown' regardless of transcript", () => {
    fc.assert(
      fc.property(fc.string(), fc.option(fc.string(), { nil: null }), (transcript, callerId) => {
        return isCallbackNumberAllowed("unknown", transcript, callerId);
      }),
    );
  });

  it("allows a number whose digit sequence appears in the transcript", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[2-9]\d{6,10}$/),
        (digits) => {
          const transcript = `Please call me back on ${digits} thanks`;
          return isCallbackNumberAllowed(digits, transcript, null);
        },
      ),
    );
  });

  it("rejects a number whose digits do not appear in the transcript or caller ID", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[2-9]\d{6,10}$/),
        fc.stringMatching(/^[2-9]\d{6,10}$/),
        (inventedDigits, transcriptDigits) => {
          fc.pre(inventedDigits !== transcriptDigits);
          fc.pre(!transcriptDigits.includes(inventedDigits));
          fc.pre(!inventedDigits.includes(transcriptDigits));
          const transcript = `Call me on ${transcriptDigits}`;
          return !isCallbackNumberAllowed(inventedDigits, transcript, null);
        },
      ),
    );
  });

  it("allows a number whose digit sequence appears in caller ID", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[2-9]\d{6,10}$/),
        fc.string({ maxLength: 10 }),
        (digits, transcriptText) => {
          fc.pre(extractDigits(transcriptText).length < digits.length);
          return isCallbackNumberAllowed(digits, transcriptText, digits);
        },
      ),
    );
  });
});

function extractDigits(value: string): string {
  return value.replace(/\D/g, "");
}

describe("extractCard", () => {
  it("P1: never invents a callback number not in transcript or caller ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[2-9]\d{9}$/),
        fc.string({ maxLength: 30 }),
        async (inventedNumber, transcript) => {
          fc.pre(!extractDigits(transcript).includes(extractDigits(inventedNumber)));

          const client = makeClientReturning({
            ...VALID_CARD_BASE,
            callbackNumber: inventedNumber,
          });

          const card = await extractCard(transcript, null, client);

          return card.callbackNumber === "unknown";
        },
      ),
      { numRuns: 50 },
    );
  });

  it("P3: urgency is always one of three allowed values", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryTranscript,
        arbitraryUrgency,
        async (transcript, urgency) => {
          const client = makeClientReturning({ ...VALID_CARD_BASE, urgency });

          const card = await extractCard(transcript, null, client);
          const result = MessageCardSchema.safeParse(card);

          return result.success && ["low", "normal", "high"].includes(result.data.urgency);
        },
      ),
      { numRuns: 50 },
    );
  });

  it("P3: falls back to a valid card when model returns an invalid urgency", async () => {
    const client = makeClientReturning({ ...VALID_CARD_BASE, urgency: "EXTREME" });

    const card = await extractCard("hello", null, { client, sleep: () => Promise.resolve() });
    const result = MessageCardSchema.safeParse(card);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(["low", "normal", "high"]).toContain(result.data.urgency);
    }
  });

  it("P7: German transcripts produce valid cards", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "Hallo, ich bin Gerhard. Bitte rufen Sie mich zurueck.",
          "Guten Tag, hier spricht Frau Weber. Es geht um mein Abonnement.",
          "Hallo, Thomas hier. Kein Stress, melden Sie sich wenn es passt.",
        ),
        async (germanTranscript) => {
          const client = makeClientReturning({
            ...VALID_CARD_BASE,
            callerName: "Gerhard",
            reason: "Anrufer moechte zurueckgerufen werden.",
          });

          const card = await extractCard(germanTranscript, null, client);
          const result = MessageCardSchema.safeParse(card);

          return result.success;
        },
      ),
    );
  });

  it("P8: reason field is short even for long transcripts", async () => {
    const longTranscript =
      "so anyway I was calling because ".repeat(100) + "I need a plumber.";

    const shortReason = "The caller needs a plumber.";
    const client = makeClientReturning({ ...VALID_CARD_BASE, reason: shortReason });

    const card = await extractCard(longTranscript, null, client);

    const sentenceCount = (card.reason.match(/[.!?]+/g) ?? []).length;
    expect(sentenceCount).toBeLessThanOrEqual(2);
  });

  it("returns a fallback card when the client always returns invalid JSON", async () => {
    let callCount = 0;
    const client: ExtractionClient = {
      async complete() {
        callCount++;
        return { content: "not valid json" };
      },
    };

    vi.useFakeTimers();
    const promise = extractCard("Hello", null, client);
    await vi.runAllTimersAsync();
    const card = await promise;
    vi.useRealTimers();

    expect(callCount).toBe(2);
    expect(card.extractionFailed).toBe(true);
    expect(card.callbackNumber).toBe("unknown");
  });

  it("retries once after the first failure and succeeds on the second attempt", async () => {
    let callCount = 0;
    const client: ExtractionClient = {
      async complete() {
        callCount++;
        if (callCount === 1) return { content: "not valid json" };
        return { content: JSON.stringify({ ...VALID_CARD_BASE }) };
      },
    };

    vi.useFakeTimers();
    const promise = extractCard("Hello", null, client);
    await vi.runAllTimersAsync();
    const card = await promise;
    vi.useRealTimers();

    expect(callCount).toBe(2);
    expect(card.extractionFailed).toBe(false);
    expect(card.callerName).toBe("Test Caller");
  });

  it("callbackNumber is guarded: caller ID number is allowed as callback number", async () => {
    const callerIdNumber = "07700900123";
    const client = makeClientReturning({
      ...VALID_CARD_BASE,
      callbackNumber: callerIdNumber,
    });

    const card = await extractCard("No number spoken.", callerIdNumber, client);

    expect(card.callbackNumber).toBe(callerIdNumber);
  });
});
