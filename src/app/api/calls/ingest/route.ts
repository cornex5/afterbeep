import { type NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { createSupabaseCallStore } from "@/lib/adapters/supabaseCallStore";
import { createSupabaseAudioStore } from "@/lib/adapters/supabaseAudioStore";
import { createResendMailer } from "@/lib/adapters/resendMailer";
import { systemClock } from "@/lib/adapters/systemClock";

const ALLOWED_CONTENT_TYPES = new Set([
  "audio/wav",
  "audio/webm",
  "audio/mpeg",
  "audio/mp4",
]);

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const audioContentType = audioField.type;
  if (!ALLOWED_CONTENT_TYPES.has(audioContentType)) {
    return NextResponse.json(
      {
        error: `Unsupported audio type: ${audioContentType}. Allowed: ${[...ALLOWED_CONTENT_TYPES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  if (audioField.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: `Audio file exceeds 10 MB limit (received ${audioField.size} bytes)` },
      { status: 413 },
    );
  }

  const ownerIdField = formData.get("ownerId");
  const notificationEmailField = formData.get("notificationEmail");
  const callerIdNumberField = formData.get("callerIdNumber");

  if (typeof ownerIdField !== "string" || ownerIdField.trim() === "") {
    return NextResponse.json({ error: "Missing ownerId" }, { status: 400 });
  }
  if (typeof notificationEmailField !== "string" || notificationEmailField.trim() === "") {
    return NextResponse.json({ error: "Missing notificationEmail" }, { status: 400 });
  }

  const ownerId = ownerIdField.trim();
  const notificationEmail = notificationEmailField.trim();
  const callerIdNumber =
    typeof callerIdNumberField === "string" && callerIdNumberField.trim() !== ""
      ? callerIdNumberField.trim()
      : null;

  const callStore = createSupabaseCallStore();
  const receivedAt = systemClock.now();

  let callId: string;
  try {
    callId = await callStore.insertCall({ ownerId, callerIdNumber, receivedAt });
  } catch {
    return NextResponse.json({ error: "Failed to create call record" }, { status: 500 });
  }

  const audioArrayBuffer = await audioField.arrayBuffer();
  const audioBuffer = Buffer.from(audioArrayBuffer);

  after(async () => {
    await runPipeline(
      {
        callId,
        receivedAt,
        audio: audioBuffer,
        ownerId,
        callerIdNumber,
        notificationEmail,
      },
      {
        callStore,
        audioStore: createSupabaseAudioStore(),
        mailer: createResendMailer(),
        clock: systemClock,
      },
    );
  });

  return NextResponse.json({ callId }, { status: 202 });
}
