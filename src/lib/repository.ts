import type { Urgency } from "./schema";

export type CallSummary = {
  id: string;
  receivedAt: Date;
  callerName: string;
  callbackNumber: string;
  reason: string;
  urgency: Urgency;
  handledAt: Date | null;
  expiresAt: Date;
  transcriptLanguage: string | null;
  callerIdNumber: string | null;
};

export type CallDetail = CallSummary & {
  transcript: string | null;
  suggestedReply: string;
  isSilentOrEmpty: boolean;
  extractionFailed: boolean;
};

export type OwnerSettings = {
  notificationEmail: string;
};

export type CallsRepository = {
  listCalls(ownerId: string): Promise<CallSummary[]>;
  getCall(callId: string, ownerId: string): Promise<CallDetail | null>;
  markHandled(callId: string, ownerId: string, handled: boolean): Promise<void>;
  getSettings(ownerId: string): Promise<OwnerSettings>;
  saveSettings(ownerId: string, settings: OwnerSettings): Promise<void>;
};
