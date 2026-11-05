import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { MessageCardSchema, FALLBACK_CARD } from "./schema";

const validCard = () =>
  fc.record({
    callerName: fc.string({ minLength: 1 }),
    callbackNumber: fc.string({ minLength: 1 }),
    reason: fc.string({ minLength: 1 }),
    urgency: fc.constantFrom("low", "normal", "high" as const),
    suggestedReply: fc.string({ minLength: 1 }),
    isSilentOrEmpty: fc.boolean(),
    extractionFailed: fc.boolean(),
  });

describe("MessageCardSchema", () => {
  it("P2: all fields always present in any valid card", () => {
    fc.assert(
      fc.property(validCard(), (card) => {
        const result = MessageCardSchema.safeParse(card);
        if (!result.success) return false;
        const { data } = result;
        return (
          data.callerName.length > 0 &&
          data.callbackNumber.length > 0 &&
          data.reason.length > 0 &&
          data.suggestedReply.length > 0 &&
          typeof data.isSilentOrEmpty === "boolean" &&
          typeof data.extractionFailed === "boolean"
        );
      }),
    );
  });

  it("P3: urgency is always one of three values", () => {
    fc.assert(
      fc.property(validCard(), (card) => {
        const result = MessageCardSchema.safeParse(card);
        if (!result.success) return true;
        return ["low", "normal", "high"].includes(result.data.urgency);
      }),
    );
  });

  it("rejects a card with an invalid urgency value", () => {
    const result = MessageCardSchema.safeParse({
      callerName: "Alice",
      callbackNumber: "555-1234",
      reason: "Needs a quote",
      urgency: "critical",
      suggestedReply: "I will call back",
      isSilentOrEmpty: false,
      extractionFailed: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a card with an empty required string field", () => {
    const result = MessageCardSchema.safeParse({
      callerName: "",
      callbackNumber: "unknown",
      reason: "unknown",
      urgency: "normal",
      suggestedReply: "unknown",
      isSilentOrEmpty: false,
      extractionFailed: false,
    });
    expect(result.success).toBe(false);
  });

  it("P6: FALLBACK_CARD always passes schema validation", () => {
    const result = MessageCardSchema.safeParse(FALLBACK_CARD);
    expect(result.success).toBe(true);
  });
});
