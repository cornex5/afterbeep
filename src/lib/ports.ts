import type { MessageCard } from "./schema";

export type CallStatus =
  | "received"
  | "transcribed"
  | "extracted"
  | "delivered"
  | "transcription-failed"
  | "extraction-failed";

export type CallRecord = {
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

export type NewCallInput = {
  ownerId: string;
  callerIdNumber: string | null;
  receivedAt: Date;
};

export type CallStore = {
  insertCall(input: NewCallInput): Promise<string>;
  updateStatus(callId: string, status: CallStatus): Promise<void>;
  setTranscript(
    callId: string,
    transcript: string,
    language: string,
    isSilentOrEmpty: boolean,
  ): Promise<void>;
  setAudioDeletedAt(callId: string, at: Date): Promise<void>;
  setDeliveredAt(callId: string, at: Date): Promise<void>;
  insertCard(callId: string, ownerId: string, card: MessageCard, receivedAt: Date): Promise<void>;
  readCall(callId: string): Promise<CallRecord | null>;
};

export type AudioStore = {
  put(callId: string, audio: Buffer): Promise<void>;
  get(callId: string): Promise<Buffer>;
  delete(callId: string): Promise<void>;
};

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type Mailer = {
  send(payload: MailPayload): Promise<void>;
};

export type Clock = {
  now(): Date;
};
