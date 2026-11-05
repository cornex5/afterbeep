import { describe, it, expect } from "vitest";
import {
  relativeTime,
  sortCalls,
  daysUntilExpiry,
  isExpiringSoon,
  getDigitSegments,
  numberToDigits,
  countUnhandled,
  countUrgent,
  languageLabel,
} from "./ui";
import type { CallSummary } from "./repository";

const now = new Date("2026-11-05T12:00:00.000Z");

function makeCall(
  partial: Partial<CallSummary> & { id: string },
): CallSummary {
  return {
    receivedAt: now,
    callerName: "Test Caller",
    callbackNumber: "+1 555 0100",
    reason: "Test reason",
    urgency: "normal",
    handledAt: null,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    transcriptLanguage: "en",
    callerIdNumber: "+15550100",
    ...partial,
  };
}

describe("relativeTime", () => {
  it("returns just now for under a minute", () => {
    const date = new Date(now.getTime() - 30_000);
    expect(relativeTime(date, now)).toBe("just now");
  });

  it("returns minutes for under an hour", () => {
    const date = new Date(now.getTime() - 45 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("45m ago");
  });

  it("returns hours for under a day", () => {
    const date = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("3h ago");
  });

  it("returns yesterday for exactly one day ago", () => {
    const date = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("yesterday");
  });

  it("returns days for under a week", () => {
    const date = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("5d ago");
  });

  it("returns weeks for under a month", () => {
    const date = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("2w ago");
  });

  it("returns months for over a month", () => {
    const date = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(relativeTime(date, now)).toBe("2mo ago");
  });
});

describe("sortCalls", () => {
  it("puts high urgency unhandled calls first", () => {
    const calls = [
      makeCall({ id: "a", urgency: "normal", receivedAt: now }),
      makeCall({ id: "b", urgency: "high", receivedAt: new Date(now.getTime() - 1000) }),
      makeCall({ id: "c", urgency: "low", receivedAt: now }),
    ];
    const sorted = sortCalls(calls);
    expect(sorted[0].id).toBe("b");
  });

  it("does not float high urgency handled calls", () => {
    const calls = [
      makeCall({
        id: "a",
        urgency: "high",
        handledAt: new Date(),
        receivedAt: new Date(now.getTime() - 1000),
      }),
      makeCall({ id: "b", urgency: "normal", receivedAt: now }),
    ];
    const sorted = sortCalls(calls);
    expect(sorted[0].id).toBe("b");
  });

  it("sorts within unurgent group by received time, newest first", () => {
    const calls = [
      makeCall({ id: "a", receivedAt: new Date(now.getTime() - 60_000) }),
      makeCall({ id: "b", receivedAt: now }),
    ];
    const sorted = sortCalls(calls);
    expect(sorted[0].id).toBe("b");
  });

  it("does not mutate the original array", () => {
    const calls = [
      makeCall({ id: "a", urgency: "low" }),
      makeCall({ id: "b", urgency: "high" }),
    ];
    const original = [...calls];
    sortCalls(calls);
    expect(calls[0].id).toBe(original[0].id);
  });
});

describe("daysUntilExpiry", () => {
  it("returns correct days until expiry", () => {
    const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(daysUntilExpiry(expiresAt, now)).toBe(5);
  });

  it("rounds up fractional days", () => {
    const expiresAt = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000);
    expect(daysUntilExpiry(expiresAt, now)).toBe(2);
  });
});

describe("isExpiringSoon", () => {
  it("returns true when 7 days or fewer remain", () => {
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(expiresAt, now)).toBe(true);
  });

  it("returns false when more than 7 days remain", () => {
    const expiresAt = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(isExpiringSoon(expiresAt, now)).toBe(false);
  });
});

describe("getDigitSegments", () => {
  it("returns correct segments for 0", () => {
    const seg = getDigitSegments("0");
    expect(seg.top).toBe(true);
    expect(seg.middle).toBe(false);
    expect(seg.bottom).toBe(true);
  });

  it("returns correct segments for 1", () => {
    const seg = getDigitSegments("1");
    expect(seg.topRight).toBe(true);
    expect(seg.bottomRight).toBe(true);
    expect(seg.top).toBe(false);
    expect(seg.middle).toBe(false);
  });

  it("returns correct segments for 8 (all segments on)", () => {
    const seg = getDigitSegments("8");
    expect(Object.values(seg).every(Boolean)).toBe(true);
  });
});

describe("numberToDigits", () => {
  it("pads single digits to two characters", () => {
    expect(numberToDigits(3)).toEqual(["0", "3"]);
  });

  it("returns two characters for two-digit numbers", () => {
    expect(numberToDigits(42)).toEqual(["4", "2"]);
  });

  it("caps at 99", () => {
    expect(numberToDigits(100)).toEqual(["9", "9"]);
  });

  it("returns 0 for negative numbers", () => {
    expect(numberToDigits(-1)).toEqual(["0"]);
  });
});

describe("countUnhandled", () => {
  it("counts only calls with no handledAt", () => {
    const calls = [
      makeCall({ id: "a", handledAt: null }),
      makeCall({ id: "b", handledAt: new Date() }),
      makeCall({ id: "c", handledAt: null }),
    ];
    expect(countUnhandled(calls)).toBe(2);
  });
});

describe("countUrgent", () => {
  it("counts only high urgency unhandled calls", () => {
    const calls = [
      makeCall({ id: "a", urgency: "high", handledAt: null }),
      makeCall({ id: "b", urgency: "high", handledAt: new Date() }),
      makeCall({ id: "c", urgency: "normal", handledAt: null }),
    ];
    expect(countUrgent(calls)).toBe(1);
  });
});

describe("languageLabel", () => {
  it("maps en to English", () => {
    expect(languageLabel("en")).toBe("English");
  });

  it("maps de to German", () => {
    expect(languageLabel("de")).toBe("German");
  });

  it("returns Unknown for null", () => {
    expect(languageLabel(null)).toBe("Unknown");
  });

  it("returns uppercased code for unknown codes", () => {
    expect(languageLabel("xx")).toBe("XX");
  });
});
