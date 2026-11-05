# Demo Session: Requirements

## REQ-1: Demo session cookie

- WHEN a visitor navigates to /demo/start, the system SHALL create a random UUID owner id, sign it with HMAC-SHA256 using DEMO_SESSION_SECRET, and set an httpOnly cookie named `ab_demo` containing `<ownerId>.<signature>`.
- WHEN NODE_ENV is not production AND DEMO_SESSION_SECRET is unset, the system SHALL fall back to a fixed development secret string.
- WHEN NODE_ENV is production AND DEMO_SESSION_SECRET is unset, the system SHALL refuse to sign.
- The cookie SHALL be sameSite lax, secure in production, and have a 24-hour max age.
- WHEN the system reads the cookie, it SHALL verify the HMAC signature using a timing-safe comparison before trusting the owner id.

## REQ-2: Demo session start route

- WHEN a GET request arrives at /demo/start, the system SHALL generate a new UUID owner id, seed demo data for that owner, set the `ab_demo` cookie, and redirect to /dashboard.
- The redirect SHALL be a 302 response so back-navigation does not regenerate the session.

## REQ-3: Owner id resolution in server code

- WHEN any server page or action calls getOwnerId(), the system SHALL read the `ab_demo` cookie and verify it.
- WHEN the cookie is missing or invalid, the system SHALL redirect to /demo/start.
- No page or action SHALL reference a hardcoded owner id string.

## REQ-4: Seeded demo data

- WHEN seedDemo(ownerId) is called, the system SHALL create 7 realistic call records for that owner, with a spread of urgency levels (high, normal, low), handled states, ages, and languages (English and German).
- The memory adapter SHALL key seeded data by ownerId so concurrent demo sessions do not collide.
- The Supabase adapter SHALL insert the calls and message cards, set handled_at on at least one, and set expires_at to 30 days from now.
- The Supabase adapter SHALL lazily delete demo calls (and cascaded cards) older than 24 hours for any owner before inserting new seed data.

## REQ-5: Owner settings migration

- The system SHALL have a Supabase migration creating table `owner_settings` with columns owner_id (uuid primary key), notification_email (text not null default '').
- Row-level security SHALL be enabled on owner_settings. No RLS policies are defined (service role key bypasses RLS).
- getSettings SHALL return `{ notificationEmail: "" }` when no row exists for that owner.

## REQ-6: WAV encoder

- The system SHALL provide pure functions in src/lib/wavEncoder.ts: downsample, floatTo16BitPCM, and encodeWav.
- encodeWav SHALL produce a valid 44-byte RIFF/WAV header with correct length fields followed by PCM data.
- All functions SHALL be side-effect-free and importable by Vitest without a browser environment.

## REQ-7: Browser call recorder component

- WHEN the DemoCallRecorder component mounts, it SHALL show a panel labelled REC with instructions to say name, number, and reason.
- WHEN the user clicks REC, the system SHALL request microphone access via getUserMedia.
- WHEN microphone access is granted, the system SHALL capture 16 kHz mono 16-bit PCM using an AudioWorklet, encode a WAV in the browser, and display elapsed time in a monospaced readout.
- The cassette reels in the panel SHALL spin while recording is active, respecting prefers-reduced-motion.
- WHEN 60 seconds elapse, the system SHALL stop recording automatically.
- WHEN the user clicks STOP or recording ends automatically, the system SHALL POST the WAV to /api/demo/call and show the status "Writing the card".
- The system SHALL poll GET /api/demo/call/[id] every 2 seconds until status is one of delivered, extraction-failed, transcription-failed, or 60 seconds have elapsed.
- WHEN processing completes, the system SHALL call router.refresh() and show a link to the new call.
- WHEN microphone access is denied or getUserMedia is unsupported, the system SHALL show a plain-language error message.

## REQ-8: Demo call ingest endpoint

- POST /api/demo/call SHALL accept multipart/form-data with a single `audio` field.
- The owner id SHALL be read exclusively from the verified `ab_demo` cookie; any ownerId field in the form SHALL be ignored.
- WHEN the cookie is absent or invalid, the system SHALL return 401.
- The system SHALL reject audio fields whose content type is not audio/wav, returning 400.
- The system SHALL reject audio larger than 3 MB, returning 413.
- The system SHALL count calls for that owner in the last 24 hours and reject with 429 when the count reaches 10.
- The system SHALL track POST requests per IP in memory and reject with 429 when more than 5 arrive within 60 seconds from the same IP.
- WHEN the owner has no notification email stored, the system SHALL use a no-op Mailer so no email is sent.
- The pipeline SHALL run in after() using Supabase ports exactly as the existing ingest route does.

## REQ-9: Demo call status endpoint

- GET /api/demo/call/[id] SHALL verify the `ab_demo` cookie and return 401 if invalid.
- The system SHALL look up the call by id and verify it belongs to the cookie owner.
- The response SHALL contain only `{ status }` using the CallStatus type.
- WHEN the call is not found or belongs to a different owner, the system SHALL return 404.

## REQ-10: Hardened ingest route

- WHEN a POST arrives at /api/calls/ingest, the system SHALL require the header `x-ingest-secret` to equal the env var INGEST_SECRET, compared using a timing-safe method.
- WHEN the header is absent or does not match, the system SHALL return 401.
- The audio content type check SHALL strip parameters (e.g. `audio/wav; codecs=1`) before comparing to the allow list.

## REQ-11: Environment configuration

- .env.example SHALL list all env var names with empty values: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TRANSCRIBE_API_URL, TRANSCRIBE_API_KEY, ANTHROPIC_API_KEY, EXTRACT_MODEL, RESEND_API_KEY, MAIL_FROM, DEMO_SESSION_SECRET, INGEST_SECRET, DEMO_MEMORY.
