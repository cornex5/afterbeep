export type TranscriptionResult = {
  text: string;
  language: string;
};

export type TranscriptionSuccess = {
  ok: true;
  value: TranscriptionResult;
};

export type TranscriptionError = {
  ok: false;
  error: { code: "api-error" | "parse-error"; message: string };
};

export type TranscriptionOutcome = TranscriptionSuccess | TranscriptionError;

export type TranscribeClient = {
  transcribe(audioBuffer: Buffer): Promise<TranscriptionOutcome>;
};

type WhisperApiResponse = {
  text: string;
  language: string;
};

function createDefaultClient(): TranscribeClient {
  return {
    async transcribe(audioBuffer: Buffer): Promise<TranscriptionOutcome> {
      const apiKey = process.env["TRANSCRIBE_API_KEY"];
      const apiUrl = process.env["TRANSCRIBE_API_URL"];

      if (!apiKey || !apiUrl) {
        return {
          ok: false,
          error: {
            code: "api-error",
            message: "TRANSCRIBE_API_KEY and TRANSCRIBE_API_URL must be set",
          },
        };
      }

      const form = new FormData();
      const bytes = new Uint8Array(audioBuffer.byteLength);
      bytes.set(audioBuffer);
      const blob = new Blob([bytes], { type: "audio/wav" });
      form.append("file", blob, "audio.wav");
      form.append("response_format", "verbose_json");

      let response: Response;
      try {
        response = await fetch(`${apiUrl}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: form,
        });
      } catch (err) {
        return {
          ok: false,
          error: {
            code: "api-error",
            message: err instanceof Error ? err.message : "Network error",
          },
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "api-error",
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return {
          ok: false,
          error: { code: "parse-error", message: "Response body was not valid JSON" },
        };
      }

      if (
        typeof body !== "object" ||
        body === null ||
        typeof (body as Record<string, unknown>)["text"] !== "string" ||
        typeof (body as Record<string, unknown>)["language"] !== "string"
      ) {
        return {
          ok: false,
          error: { code: "parse-error", message: "Unexpected response shape from transcription API" },
        };
      }

      const parsed = body as WhisperApiResponse;
      return {
        ok: true,
        value: { text: parsed.text, language: parsed.language },
      };
    },
  };
}

const defaultClient = createDefaultClient();

export async function transcribeAudio(
  audioBuffer: Buffer,
  client: TranscribeClient = defaultClient,
): Promise<TranscriptionOutcome> {
  return client.transcribe(audioBuffer);
}
