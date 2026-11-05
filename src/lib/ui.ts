import type { Urgency } from "./schema";
import type { CallSummary } from "./repository";

export function relativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function sortCalls(calls: CallSummary[]): CallSummary[] {
  return [...calls].sort((a, b) => {
    const aUrgent = a.urgency === "high" && a.handledAt === null;
    const bUrgent = b.urgency === "high" && b.handledAt === null;

    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;

    return b.receivedAt.getTime() - a.receivedAt.getTime();
  });
}

export function daysUntilExpiry(expiresAt: Date, now: Date): number {
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function isExpiringSoon(expiresAt: Date, now: Date): boolean {
  return daysUntilExpiry(expiresAt, now) <= 7;
}

export type SegmentId =
  | "top"
  | "topLeft"
  | "topRight"
  | "middle"
  | "bottomLeft"
  | "bottomRight"
  | "bottom";

export type DigitSegments = Record<SegmentId, boolean>;

const SEGMENTS: Record<string, DigitSegments> = {
  "0": {
    top: true,
    topLeft: true,
    topRight: true,
    middle: false,
    bottomLeft: true,
    bottomRight: true,
    bottom: true,
  },
  "1": {
    top: false,
    topLeft: false,
    topRight: true,
    middle: false,
    bottomLeft: false,
    bottomRight: true,
    bottom: false,
  },
  "2": {
    top: true,
    topLeft: false,
    topRight: true,
    middle: true,
    bottomLeft: true,
    bottomRight: false,
    bottom: true,
  },
  "3": {
    top: true,
    topLeft: false,
    topRight: true,
    middle: true,
    bottomLeft: false,
    bottomRight: true,
    bottom: true,
  },
  "4": {
    top: false,
    topLeft: true,
    topRight: true,
    middle: true,
    bottomLeft: false,
    bottomRight: true,
    bottom: false,
  },
  "5": {
    top: true,
    topLeft: true,
    topRight: false,
    middle: true,
    bottomLeft: false,
    bottomRight: true,
    bottom: true,
  },
  "6": {
    top: true,
    topLeft: true,
    topRight: false,
    middle: true,
    bottomLeft: true,
    bottomRight: true,
    bottom: true,
  },
  "7": {
    top: true,
    topLeft: false,
    topRight: true,
    middle: false,
    bottomLeft: false,
    bottomRight: true,
    bottom: false,
  },
  "8": {
    top: true,
    topLeft: true,
    topRight: true,
    middle: true,
    bottomLeft: true,
    bottomRight: true,
    bottom: true,
  },
  "9": {
    top: true,
    topLeft: true,
    topRight: true,
    middle: true,
    bottomLeft: false,
    bottomRight: true,
    bottom: true,
  },
};

export function getDigitSegments(digit: string): DigitSegments {
  return (
    SEGMENTS[digit] ?? {
      top: false,
      topLeft: false,
      topRight: false,
      middle: true,
      bottomLeft: false,
      bottomRight: false,
      bottom: false,
    }
  );
}

export function numberToDigits(n: number): string[] {
  if (n < 0) return ["0"];
  const str = Math.min(n, 99).toString();
  return str.length === 1 ? ["0", str] : str.split("");
}

export function countUnhandled(calls: CallSummary[]): number {
  return calls.filter((c) => c.handledAt === null).length;
}

export function countUrgent(calls: CallSummary[]): number {
  return calls.filter((c) => c.urgency === "high" && c.handledAt === null)
    .length;
}

export function languageLabel(code: string | null): string {
  if (!code) return "Unknown";
  const labels: Record<string, string> = {
    en: "English",
    de: "German",
    fr: "French",
    es: "Spanish",
    it: "Italian",
    nl: "Dutch",
    pl: "Polish",
    pt: "Portuguese",
  };
  return labels[code] ?? code.toUpperCase();
}
