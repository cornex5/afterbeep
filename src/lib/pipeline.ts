import { classifySilence } from "./audio";
import { transcribeAudio, type TranscribeClient } from "./transcribe";
import { extractCard, type ExtractionClient } from "./extract";
import { renderCardEmail } from "./email";
import { FALLBACK_CARD } from "./schema";
import type { AudioStore, CallStore, Clock, Mailer } from "./ports";

export type PipelineInput = {
  callId?: string;
  receivedAt?: Date;
  audio: Buffer;
  ownerId: string;
  callerIdNumber: string | null;
  notificationEmail: string;
};

export type PipelinePorts = {
  callStore: CallStore;
  audioStore: AudioStore;
  mailer: Mailer;
  clock: Clock;
  transcribeClient?: TranscribeClient;
  extractClient?: ExtractionClient;
};

const LATENCY_WARN_MS = 30_000;

export async function runPipeline(
  input: PipelineInput,
  ports: PipelinePorts,
): Promise<void> {
  const { callStore, audioStore, mailer, clock } = ports;
  const startTime = input.receivedAt ?? clock.now();

  let callId: string;

  if (input.callId !== undefined) {
    callId = input.callId;
  } else {
    try {
      callId = await callStore.insertCall({
        ownerId: input.ownerId,
        callerIdNumber: input.callerIdNumber,
        receivedAt: startTime,
      });
    } catch {
      return;
    }
  }

  try {
    await audioStore.put(callId, input.audio);
  } catch {
    await safeUpdateStatus(callStore, callId, "transcription-failed");
    await safeFailureEmail(
      mailer,
      input.notificationEmail,
      callId,
      "Audio storage failed. The call was received but no transcript is available.",
    );
    return;
  }

  const isSilent = classifySilence(input.audio);

  if (isSilent) {
    await safeSetTranscript(callStore, callId, "", "unknown", true);
    await safeDeleteAudio(audioStore, callStore, callId, clock);

    const card = { ...FALLBACK_CARD, isSilentOrEmpty: true, extractionFailed: false };

    await safeInsertCard(callStore, callId, input.ownerId, card, startTime);
    await safeUpdateStatus(callStore, callId, "extracted");

    const rendered = renderCardEmail(card, {
      callId,
      receivedAt: startTime,
      callerIdNumber: input.callerIdNumber,
      transcriptLanguage: "unknown",
    });

    await safeSendEmail(mailer, {
      to: input.notificationEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    await safeSetDeliveredAt(callStore, callId, clock.now());
    await safeUpdateStatus(callStore, callId, "delivered");

    logLatency(callId, startTime, clock.now());
    return;
  }

  let audio: Buffer;
  try {
    audio = await audioStore.get(callId);
  } catch {
    await safeUpdateStatus(callStore, callId, "transcription-failed");
    await safeFailureEmail(
      mailer,
      input.notificationEmail,
      callId,
      "Audio retrieval failed before transcription.",
    );
    return;
  }

  const transcribeResult = await transcribeAudio(audio, ports.transcribeClient);

  if (!transcribeResult.ok) {
    await safeUpdateStatus(callStore, callId, "transcription-failed");
    await safeFailureEmail(
      mailer,
      input.notificationEmail,
      callId,
      `Transcription failed: ${transcribeResult.error.message}`,
    );
    return;
  }

  const { text: transcript, language } = transcribeResult.value;

  await safeSetTranscript(callStore, callId, transcript, language, false);
  await safeUpdateStatus(callStore, callId, "transcribed");
  await safeDeleteAudio(audioStore, callStore, callId, clock);

  const extractOptions = ports.extractClient ? { client: ports.extractClient } : {};

  const card = await extractCard(transcript, input.callerIdNumber, extractOptions);

  await safeInsertCard(callStore, callId, input.ownerId, card, startTime);
  await safeUpdateStatus(
    callStore,
    callId,
    card.extractionFailed ? "extraction-failed" : "extracted",
  );

  const rendered = renderCardEmail(card, {
    callId,
    receivedAt: startTime,
    callerIdNumber: input.callerIdNumber,
    transcriptLanguage: language,
  });

  await safeSendEmail(mailer, {
    to: input.notificationEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  await safeSetDeliveredAt(callStore, callId, clock.now());
  await safeUpdateStatus(callStore, callId, "delivered");

  logLatency(callId, startTime, clock.now());
}

function logLatency(callId: string, start: Date, end: Date): void {
  const ms = end.getTime() - start.getTime();
  if (ms > LATENCY_WARN_MS) {
    console.warn(`[pipeline] call ${callId} took ${ms}ms (over ${LATENCY_WARN_MS}ms threshold)`);
  }
}

async function safeUpdateStatus(
  callStore: CallStore,
  callId: string,
  status: Parameters<CallStore["updateStatus"]>[1],
): Promise<void> {
  try {
    await callStore.updateStatus(callId, status);
  } catch {
  }
}

async function safeSetTranscript(
  callStore: CallStore,
  callId: string,
  transcript: string,
  language: string,
  isSilentOrEmpty: boolean,
): Promise<void> {
  try {
    await callStore.setTranscript(callId, transcript, language, isSilentOrEmpty);
  } catch {
  }
}

async function safeDeleteAudio(
  audioStore: AudioStore,
  callStore: CallStore,
  callId: string,
  clock: Clock,
): Promise<void> {
  try {
    await audioStore.delete(callId);
    await callStore.setAudioDeletedAt(callId, clock.now());
  } catch {
  }
}

async function safeInsertCard(
  callStore: CallStore,
  callId: string,
  ownerId: string,
  card: Parameters<CallStore["insertCard"]>[2],
  receivedAt: Date,
): Promise<void> {
  try {
    await callStore.insertCard(callId, ownerId, card, receivedAt);
  } catch {
  }
}

async function safeSendEmail(
  mailer: Mailer,
  payload: Parameters<Mailer["send"]>[0],
): Promise<void> {
  try {
    await mailer.send(payload);
  } catch {
  }
}

async function safeSetDeliveredAt(callStore: CallStore, callId: string, at: Date): Promise<void> {
  try {
    await callStore.setDeliveredAt(callId, at);
  } catch {
  }
}

async function safeFailureEmail(
  mailer: Mailer,
  to: string,
  callId: string,
  detail: string,
): Promise<void> {
  await safeSendEmail(mailer, {
    to,
    subject: "Call processing failed",
    html: `<p>A call could not be processed.</p><p>Call ID: ${callId}</p><p>${detail}</p>`,
    text: `A call could not be processed.\n\nCall ID: ${callId}\n\n${detail}`,
  });
}
