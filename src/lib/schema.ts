import { z } from "zod";

export const UrgencySchema = z.enum(["low", "normal", "high"]);

export const MessageCardSchema = z.object({
  callerName: z.string().min(1),
  callbackNumber: z.string().min(1),
  reason: z.string().min(1),
  urgency: UrgencySchema,
  suggestedReply: z.string().min(1),
  isSilentOrEmpty: z.boolean(),
  extractionFailed: z.boolean(),
});

export type Urgency = z.infer<typeof UrgencySchema>;
export type MessageCard = z.infer<typeof MessageCardSchema>;

export const FALLBACK_CARD: MessageCard = {
  callerName: "unknown",
  callbackNumber: "unknown",
  reason: "unknown",
  urgency: "normal",
  suggestedReply: "unknown",
  isSilentOrEmpty: false,
  extractionFailed: true,
};
