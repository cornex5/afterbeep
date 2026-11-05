import { MessageCardSchema, FALLBACK_CARD, type MessageCard } from "./schema";
import { buildExtractionPrompt } from "./extractionPrompt";

export type ExtractionClientMessage = {
  role: "user";
  content: string;
};

export type ExtractionClientResponse = {
  content: string;
};

export type ExtractionClient = {
  complete(messages: ExtractionClientMessage[]): Promise<ExtractionClientResponse>;
};

type AnthropicLike = {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
};

function createDefaultClient(): ExtractionClient {
  return {
    async complete(messages: ExtractionClientMessage[]): Promise<ExtractionClientResponse> {
      const model = process.env["EXTRACT_MODEL"] ?? "claude-haiku-5-5";
      const { Anthropic } = await import("@anthropic-ai/sdk");
      const anthropic = new Anthropic() as AnthropicLike;
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        messages,
      });
      const block = response.content.find((b) => b.type === "text");
      return { content: block?.text ?? "" };
    },
  };
}

const defaultClient = createDefaultClient();

function extractDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function digitSequenceAppearsIn(digitSequence: string, text: string): boolean {
  if (digitSequence.length === 0) return false;
  const textDigits = extractDigits(text);
  return textDigits.includes(digitSequence);
}

function isCallbackNumberAllowed(
  callbackNumber: string,
  transcript: string,
  callerIdNumber: string | null,
): boolean {
  if (callbackNumber === "unknown") return true;
  const digits = extractDigits(callbackNumber);
  if (digits.length === 0) return false;
  if (digitSequenceAppearsIn(digits, transcript)) return true;
  if (callerIdNumber !== null && digitSequenceAppearsIn(digits, callerIdNumber)) return true;
  return false;
}

async function attemptExtraction(
  transcript: string,
  callerIdNumber: string | null,
  client: ExtractionClient,
): Promise<MessageCard | null> {
  const prompt = buildExtractionPrompt(transcript, callerIdNumber);
  let response: ExtractionClientResponse;
  try {
    response = await client.complete([{ role: "user", content: prompt }]);
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  const result = MessageCardSchema.safeParse(parsed);
  if (!result.success) return null;

  const card = result.data;

  if (!isCallbackNumberAllowed(card.callbackNumber, transcript, callerIdNumber)) {
    return {
      ...card,
      callbackNumber: "unknown",
    };
  }

  return card;
}

export type ExtractCardOptions = {
  client?: ExtractionClient;
  sleep?: (ms: number) => Promise<void>;
};

export async function extractCard(
  transcript: string,
  callerIdNumber: string | null,
  clientOrOptions: ExtractionClient | ExtractCardOptions = defaultClient,
): Promise<MessageCard> {
  let client: ExtractionClient;
  let sleep: (ms: number) => Promise<void>;

  if (typeof (clientOrOptions as ExtractionClient).complete === "function") {
    client = clientOrOptions as ExtractionClient;
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  } else {
    const opts = clientOrOptions as ExtractCardOptions;
    client = opts.client ?? defaultClient;
    sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  const firstAttempt = await attemptExtraction(transcript, callerIdNumber, client);
  if (firstAttempt !== null) return firstAttempt;

  await sleep(5000);

  const secondAttempt = await attemptExtraction(transcript, callerIdNumber, client);
  if (secondAttempt !== null) return secondAttempt;

  return { ...FALLBACK_CARD };
}

export { isCallbackNumberAllowed };
