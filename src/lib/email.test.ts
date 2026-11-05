import { describe, it, expect } from "vitest";
import { renderCardEmail, type CallMeta } from "./email";
import { FALLBACK_CARD, type MessageCard } from "./schema";

const baseMeta: CallMeta = {
  callId: "abc-123",
  receivedAt: new Date("2026-11-05T12:00:00.000Z"),
  callerIdNumber: "+441234567890",
  transcriptLanguage: "en",
};

const normalCard: MessageCard = {
  callerName: "Sarah",
  callbackNumber: "07700900123",
  reason: "The caller has a burst pipe and needs urgent help.",
  urgency: "normal",
  suggestedReply: "Hi Sarah, I will call you back shortly.",
  isSilentOrEmpty: false,
  extractionFailed: false,
};

describe("renderCardEmail", () => {
  it("includes caller name in subject", () => {
    const { subject } = renderCardEmail(normalCard, baseMeta);
    expect(subject).toContain("Sarah");
  });

  it("includes the received date in the subject", () => {
    const { subject } = renderCardEmail(normalCard, baseMeta);
    expect(subject).toContain("2026-11-05");
  });

  it("includes callback number in html and text", () => {
    const result = renderCardEmail(normalCard, baseMeta);
    expect(result.html).toContain("07700900123");
    expect(result.text).toContain("07700900123");
  });

  it("includes reason in html and text", () => {
    const result = renderCardEmail(normalCard, baseMeta);
    expect(result.html).toContain("burst pipe");
    expect(result.text).toContain("burst pipe");
  });

  it("includes suggested reply in html and text", () => {
    const result = renderCardEmail(normalCard, baseMeta);
    expect(result.html).toContain("call you back shortly");
    expect(result.text).toContain("call you back shortly");
  });

  it("includes call id in html and text", () => {
    const result = renderCardEmail(normalCard, baseMeta);
    expect(result.html).toContain("abc-123");
    expect(result.text).toContain("abc-123");
  });

  it("all-unknown fallback card renders without throwing", () => {
    const result = renderCardEmail(FALLBACK_CARD, baseMeta);
    expect(result.subject).toBeTruthy();
    expect(result.html).toContain("unknown");
    expect(result.text).toContain("unknown");
  });

  it("fallback card shows caller name as unknown in subject", () => {
    const { subject } = renderCardEmail(FALLBACK_CARD, baseMeta);
    expect(subject).toContain("unknown");
  });

  it("high urgency card prefixes subject with [HIGH URGENCY]", () => {
    const highCard: MessageCard = { ...normalCard, urgency: "high" };
    const { subject } = renderCardEmail(highCard, baseMeta);
    expect(subject.startsWith("[HIGH URGENCY]")).toBe(true);
  });

  it("high urgency card shows HIGH URGENCY label in html", () => {
    const highCard: MessageCard = { ...normalCard, urgency: "high" };
    const { html } = renderCardEmail(highCard, baseMeta);
    expect(html).toContain("HIGH URGENCY");
  });

  it("normal urgency card does not prefix subject", () => {
    const { subject } = renderCardEmail(normalCard, baseMeta);
    expect(subject.startsWith("[HIGH URGENCY]")).toBe(false);
  });

  it("low urgency card does not prefix subject", () => {
    const lowCard: MessageCard = { ...normalCard, urgency: "low" };
    const { subject } = renderCardEmail(lowCard, baseMeta);
    expect(subject.startsWith("[HIGH URGENCY]")).toBe(false);
  });

  it("extraction-failed card includes transcript attachment note in html", () => {
    const failedCard: MessageCard = { ...FALLBACK_CARD, extractionFailed: true };
    const { html } = renderCardEmail(failedCard, baseMeta);
    expect(html).toContain("extraction note");
    expect(html).toContain("raw transcript");
  });

  it("extraction-failed card includes note in plain text", () => {
    const failedCard: MessageCard = { ...FALLBACK_CARD, extractionFailed: true };
    const { text } = renderCardEmail(failedCard, baseMeta);
    expect(text).toContain("raw transcript");
  });

  it("non-failed card does not include extraction note", () => {
    const { html } = renderCardEmail(normalCard, baseMeta);
    expect(html).not.toContain("raw transcript");
  });

  it("null callerIdNumber renders as not available", () => {
    const meta: CallMeta = { ...baseMeta, callerIdNumber: null };
    const result = renderCardEmail(normalCard, meta);
    expect(result.html).toContain("not available");
    expect(result.text).toContain("not available");
  });

  it("null transcriptLanguage renders as unknown", () => {
    const meta: CallMeta = { ...baseMeta, transcriptLanguage: null };
    const result = renderCardEmail(normalCard, meta);
    expect(result.html).toContain(">unknown<");
    expect(result.text).toContain("Language: unknown");
  });

  it("html output contains doctype and body tags", () => {
    const { html } = renderCardEmail(normalCard, baseMeta);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("html special characters in reason are escaped", () => {
    const xssCard: MessageCard = {
      ...normalCard,
      reason: '<script>alert("xss")</script>',
    };
    const { html } = renderCardEmail(xssCard, baseMeta);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
