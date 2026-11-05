import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { verifyCookieValue } from "@/lib/demoSession";
import { runPipeline } from "@/lib/pipeline";
import { createSupabaseCallStore } from "@/lib/adapters/supabaseCallStore";
import { createSupabaseAudioStore } from "@/lib/adapters/supabaseAudioStore";
import { systemClock } from "@/lib/adapters/systemClock";
import { getRepository } from "@/lib/repositoryFactory";
import { createResendMailer } from "@/lib/adapters/resendMailer";
import { isMailAllowed, parseAllowlist } from "@/lib/demoMail";
import type { Mailer } from "@/lib/ports";

const COOKIE_NAME = "ab_demo";
const ALLOWED_AUDIO_TYPES = new Set(["audio/wav"]);
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const MAX_CALLS_PER_OWNER_24H = 10;
const MAX_CALLS_PER_IP_60S = 5;

const ipTimestamps = new Map<string, number[]>();

function noopMailer(): Mailer {
  return {
    send: async () => undefined,
  };
}

function resolveIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

function checkIpRate(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - 60_000;
  const times = (ipTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  if (times.length >= MAX_CALLS_PER_IP_60S) return false;
  times.push(now);
  ipTimestamps.set(ip, times);
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const ownerId = verifyCookieValue(cookie.value);
  if (!ownerId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const ip = resolveIp(request);
  if (!checkIpRate(ip)) {
    return NextResponse.json(
      { error: "Too many requests from your connection. Wait a minute and try again." },
      { status: 429 },
    );
  }

  const repo = getRepository();
  const existing = await repo.listCalls(ownerId);
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = existing.filter((c) => c.receivedAt > cutoff).length;
  if (recentCount >= MAX_CALLS_PER_OWNER_24H) {
    return NextResponse.json(
      { error: "Demo limit reached. You can record up to 10 calls per day." },
      { status: 429 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const baseContentType = contentType.split(";")[0]?.trim() ?? "";
  if (baseContentType !== "multipart/form-data") {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const audioField = formData.get("audio");
  if (!(audioField instanceof File)) {
    return NextResponse.json({ error: "Missing audio field" }, { status: 400 });
  }

  const rawAudioType = audioField.type;
  const audioType = rawAudioType.split(";")[0]?.trim() ?? "";
  if (!ALLOWED_AUDIO_TYPES.has(audioType)) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${audioType}. Only audio/wav is accepted.` },
      { status: 400 },
    );
  }

  if (audioField.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `Audio exceeds 3 MB limit (received ${audioField.size} bytes).` },
      { status: 413 },
    );
  }

  const callStore = createSupabaseCallStore();
  const receivedAt = systemClock.now();

  let callId: string;
  try {
    callId = await callStore.insertCall({ ownerId, callerIdNumber: null, receivedAt });
  } catch {
    return NextResponse.json({ error: "Failed to create call record" }, { status: 500 });
  }

  const audioBuffer = Buffer.from(await audioField.arrayBuffer());
  const settings = await getRepository().getSettings(ownerId);
  const allowlist = parseAllowlist(process.env["DEMO_MAIL_ALLOWLIST"]);
  const canMail = isMailAllowed(settings.notificationEmail, allowlist);
  const notificationEmail = canMail ? settings.notificationEmail : "";

  after(async () => {
    await runPipeline(
      { callId, receivedAt, audio: audioBuffer, ownerId, callerIdNumber: null, notificationEmail },
      {
        callStore,
        audioStore: createSupabaseAudioStore(),
        mailer: canMail ? createResendMailer() : noopMailer(),
        clock: systemClock,
      },
    );
  });

  return NextResponse.json({ callId }, { status: 202 });
}
