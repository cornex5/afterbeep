import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "afterbeep-demo-dev-secret-do-not-use-in-production";

function resolveSecret(): string {
  const env = process.env["DEMO_SESSION_SECRET"];
  if (env) return env;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("DEMO_SESSION_SECRET must be set in production");
  }
  return DEV_SECRET;
}

function computeSignature(ownerId: string, secret: string): string {
  return createHmac("sha256", secret).update(ownerId).digest("base64url");
}

export function signOwnerId(ownerId: string): string {
  const secret = resolveSecret();
  const sig = computeSignature(ownerId, secret);
  return `${ownerId}.${sig}`;
}

export function verifyCookieValue(value: string): string | null {
  const dotIndex = value.indexOf(".");
  if (dotIndex === -1) return null;

  const ownerId = value.slice(0, dotIndex);
  const provided = value.slice(dotIndex + 1);

  if (!ownerId) return null;

  let secret: string;
  try {
    secret = resolveSecret();
  } catch {
    return null;
  }

  const expected = computeSignature(ownerId, secret);

  let providedBytes: Buffer;
  let expectedBytes: Buffer;
  try {
    providedBytes = Buffer.from(provided, "base64url");
    expectedBytes = Buffer.from(expected, "base64url");
  } catch {
    return null;
  }

  if (providedBytes.length !== expectedBytes.length) return null;

  try {
    if (!timingSafeEqual(providedBytes, expectedBytes)) return null;
  } catch {
    return null;
  }

  return ownerId;
}
