import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signOwnerId, verifyCookieValue } from "./demoSession";

const TEST_OWNER_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("demoSession", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, DEMO_SESSION_SECRET: "test-secret-for-unit-tests" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("signOwnerId", () => {
    it("returns a string with exactly one dot separator", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      const parts = value.split(".");
      expect(parts.length).toBe(2);
    });

    it("embeds the owner id before the dot", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      expect(value.startsWith(TEST_OWNER_ID + ".")).toBe(true);
    });

    it("produces different signatures for different owner ids", () => {
      const a = signOwnerId("aaaaaaaa-0000-0000-0000-000000000001");
      const b = signOwnerId("aaaaaaaa-0000-0000-0000-000000000002");
      const sigA = a.split(".")[1];
      const sigB = b.split(".")[1];
      expect(sigA).not.toBe(sigB);
    });

    it("produces the same signature for the same owner id (deterministic)", () => {
      expect(signOwnerId(TEST_OWNER_ID)).toBe(signOwnerId(TEST_OWNER_ID));
    });
  });

  describe("verifyCookieValue", () => {
    it("returns the owner id for a valid signed value", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      expect(verifyCookieValue(value)).toBe(TEST_OWNER_ID);
    });

    it("returns null when the signature is tampered", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      const [id, sig] = value.split(".");
      const tampered = `${id}.${sig!.slice(0, -1)}X`;
      expect(verifyCookieValue(tampered)).toBeNull();
    });

    it("returns null when the owner id is swapped", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      const sig = value.split(".")[1];
      const other = "aaaaaaaa-0000-0000-0000-000000000099";
      expect(verifyCookieValue(`${other}.${sig}`)).toBeNull();
    });

    it("returns null for an empty string", () => {
      expect(verifyCookieValue("")).toBeNull();
    });

    it("returns null when there is no dot separator", () => {
      expect(verifyCookieValue("nodothere")).toBeNull();
    });

    it("returns null when ownerId part is empty", () => {
      expect(verifyCookieValue(".somesig")).toBeNull();
    });

    it("returns null when the signature part is empty but a dot is present", () => {
      expect(verifyCookieValue(`${TEST_OWNER_ID}.`)).toBeNull();
    });

    it("returns null when signed with a different secret", () => {
      const value = signOwnerId(TEST_OWNER_ID);
      process.env["DEMO_SESSION_SECRET"] = "different-secret";
      expect(verifyCookieValue(value)).toBeNull();
    });
  });
});
