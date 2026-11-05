import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isMailAllowed, parseAllowlist } from "./demoMail";

describe("parseAllowlist", () => {
  it("returns an empty list for undefined and blank input", () => {
    expect(parseAllowlist(undefined)).toEqual([]);
    expect(parseAllowlist("  ,, ")).toEqual([]);
  });

  it("trims and lowercases entries", () => {
    expect(parseAllowlist(" A@b.org , c@d.org ")).toEqual(["a@b.org", "c@d.org"]);
  });
});

describe("isMailAllowed", () => {
  it("matches case insensitively", () => {
    expect(isMailAllowed("Mail@Example.org", ["mail@example.org"])).toBe(true);
  });

  it("rejects empty and unlisted addresses", () => {
    expect(isMailAllowed("", ["a@b.org"])).toBe(false);
    expect(isMailAllowed("x@y.org", ["a@b.org"])).toBe(false);
  });

  it("never allows anything with an empty allowlist", () => {
    fc.assert(
      fc.property(fc.string(), (email) => !isMailAllowed(email, [])),
    );
  });
});
