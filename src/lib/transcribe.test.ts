import { describe, it, expect } from "vitest";
import { transcribeAudio, type TranscribeClient, type TranscriptionOutcome } from "./transcribe";

const audioBuffer = Buffer.from("fake-audio-data");

function makeMockClient(outcome: TranscriptionOutcome): TranscribeClient {
  return {
    async transcribe(_audioBuffer: Buffer): Promise<TranscriptionOutcome> {
      return outcome;
    },
  };
}

describe("transcribeAudio", () => {
  it("returns success result for an English transcription", async () => {
    const client = makeMockClient({
      ok: true,
      value: { text: "Hi, this is John, please call me back.", language: "en" },
    });

    const result = await transcribeAudio(audioBuffer, client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("Hi, this is John, please call me back.");
      expect(result.value.language).toBe("en");
    }
  });

  it("returns success result for a German transcription", async () => {
    const client = makeMockClient({
      ok: true,
      value: {
        text: "Hallo, hier ist Klaus Mueller, bitte rufen Sie mich zurueck.",
        language: "de",
      },
    });

    const result = await transcribeAudio(audioBuffer, client);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.language).toBe("de");
      expect(result.value.text.length).toBeGreaterThan(0);
    }
  });

  it("returns api-error when the API call fails", async () => {
    const client = makeMockClient({
      ok: false,
      error: { code: "api-error", message: "HTTP 503: Service Unavailable" },
    });

    const result = await transcribeAudio(audioBuffer, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("api-error");
      expect(result.error.message).toContain("503");
    }
  });

  it("returns parse-error when the response cannot be parsed", async () => {
    const client = makeMockClient({
      ok: false,
      error: { code: "parse-error", message: "Response body was not valid JSON" },
    });

    const result = await transcribeAudio(audioBuffer, client);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("parse-error");
    }
  });
});
