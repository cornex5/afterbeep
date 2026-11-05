# Demo Session: Design

## Session model

No accounts. A random UUID becomes the owner id for the duration of the demo. The id is embedded in a signed cookie so the server can trust it without a database lookup on every request.

Cookie value format: `<ownerId>.<base64url-HMAC-SHA256>`

The HMAC input is the ownerId string. The signature is base64url-encoded. Verification uses `crypto.timingSafeEqual` on the computed vs provided signature bytes.

`src/lib/demoSession.ts` contains two pure functions and no framework imports:
- `signOwnerId(ownerId, secret) -> string` produces the full cookie value.
- `verifyCookieValue(value, secret) -> string | null` returns the ownerId if valid, null otherwise.

`src/lib/session.ts` provides `getOwnerId()` for Next.js server code (reads cookies(), calls verifyCookieValue, redirects if invalid).

## Route: GET /demo/start

1. Generate `crypto.randomUUID()`.
2. Call `repository.seedDemo(ownerId)`.
3. Sign the ownerId into a cookie value.
4. Set the `ab_demo` cookie (httpOnly, sameSite: lax, secure in production, maxAge: 86400).
5. Redirect to /dashboard with 302.

## Repository extension

`CallsRepository` gains `seedDemo(ownerId: string): Promise<void>`.

Memory adapter: clears any existing calls for that owner, then inserts 7 pre-defined records keyed to the given ownerId. Settings default to `{ notificationEmail: "" }`.

Supabase adapter: deletes existing calls for the owner received more than 24 hours ago (cards cascade), upserts owner settings with empty email, then inserts 7 calls and their message cards in a batch.

## WAV encoding

Pure browser-side pipeline:

```
Float32Array samples (48 kHz) -> downsample(2) -> Float32Array (16 kHz)
  -> floatTo16BitPCM -> Int16Array
  -> encodeWav(sampleRate, channels, pcmData) -> Uint8Array
```

The WAV header is 44 bytes. Key fields: RIFF chunk size = 36 + dataBytes, data chunk size = dataBytes. Both little-endian uint32.

## DemoCallRecorder component

State machine: `idle` -> `requesting` -> `recording` -> `uploading` -> `polling` -> `done` / `failed`.

AudioWorklet is loaded from a Blob URL to avoid serving a separate file. The worklet accumulates Float32 samples and sends them in 4096-sample batches to the main thread via MessagePort. The component reassembles the full buffer, downsamples and encodes on stop.

Rate limiting on the client side is handled server-side; the component displays the 429 message as a plain string.

## POST /api/demo/call

1. Verify `ab_demo` cookie -> 401 if invalid.
2. Parse multipart form, validate audio field (audio/wav, 3 MB).
3. Count owner calls in last 24h via `callStore.countRecentCalls(ownerId, since)` (or repository listCalls length as fallback) -> 429 if >= 10.
4. Per-IP rate: module-level `Map<string, number[]>` of timestamps; prune > 60s old, count remaining -> 429 if >= 5.
5. `callStore.insertCall` -> callId.
6. `after(() => runPipeline(...))`.
7. Return `{ callId }` with 202.

No-op Mailer: `{ send: async () => {} }`.

## GET /api/demo/call/[id]

1. Verify cookie -> 401.
2. `callStore.readCall(id)` -> 404 if not found or ownerId mismatch.
3. Return `{ status: call.status }`.

## Hardened ingest route

Add at the top of the POST handler:

```ts
const secret = process.env["INGEST_SECRET"] ?? "";
const provided = request.headers.get("x-ingest-secret") ?? "";
if (!timingSafeEqual(secret, provided)) return 401;
```

Strip content type parameters before the allow list check (already done for multipart check; apply same pattern to audioField.type).

## Migration 0003

```sql
create table owner_settings (
  owner_id uuid primary key,
  notification_email text not null default ''
);
alter table owner_settings enable row level security;
```

The Supabase repository replaces the old `owners` table references with `owner_settings`.
