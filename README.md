# Afterbeep

The answering machine, resurrected, for small businesses.

When nobody picks up, Afterbeep records the caller, transcribes the message, pulls out a card (caller, callback number, reason, urgency, suggested reply) and emails it to the owner. Every call is a cassette on a tape-deck dashboard.

Built for Kiroween 2026, Resurrection category. MIT license.

## Try it

Open the demo, click "Try the demo", and you get a private workspace with seeded cassettes. Press "Record a demo call", say who you are, your number and why you are calling, stop, and watch the card appear. Calls can be in English or German.

## How it works

1. Audio comes in (browser recorder or the telephony ingest route).
2. Silence check on the PCM audio. Silent calls never reach the models.
3. Speech to text through any Whisper compatible endpoint.
4. Claude extracts a card against a zod schema. A callback number is only accepted if its digits appear in the transcript or the caller ID, so it can never be invented. On failure the card falls back to a safe default and the transcript is kept.
5. The card is stored and mailed. Audio is deleted after processing, transcripts and cards expire after 30 days.

`runPipeline` is pure orchestration. Storage, audio, mail and the clock are injected ports, which is why the whole pipeline is covered by tests, including a property test that it always ends in a terminal status.

## Stack

Next.js 16 (App Router), React 19, TypeScript strict, Supabase Postgres, zod 4, Anthropic SDK, Resend, vitest and fast-check, pnpm.

## Run locally

```
pnpm install
cp .env.example .env.local
DEMO_MEMORY=1 pnpm dev
```

With `DEMO_MEMORY=1` or without `SUPABASE_URL` the app uses an in-memory repository with seeded data. The call recorder needs a Supabase project and the API keys below to run the full pipeline.

## Environment

| Name | Purpose |
| --- | --- |
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | Database and audio storage, server only |
| TRANSCRIBE_API_URL, TRANSCRIBE_API_KEY | Whisper compatible transcription endpoint |
| ANTHROPIC_API_KEY, EXTRACT_MODEL | Card extraction |
| RESEND_API_KEY, MAIL_FROM | Email delivery |
| DEMO_SESSION_SECRET | Signs the demo session cookie, required in production |
| DEMO_MAIL_ALLOWLIST | Comma separated addresses the public demo may email, empty means no demo mail |
| INGEST_SECRET | Shared secret for the telephony ingest route, required in production |

Apply the SQL files in `supabase/migrations` in order. Row level security is on and there are no public policies: all access goes through the server.

## Privacy

Audio is deleted once the card exists. Transcripts and cards are kept 30 days, then expire. The caller hears a disclosure before recording. See `.kiro/steering/privacy.md`.

## Built with Kiro

The `.kiro` folder is the real working record: steering files, specs with EARS requirements, hooks, an MCP config and a restricted agent. Most application code was written by Kiro from those specs. A few files were fixed by hand where Kiro's output failed the type check or a test, and the hooks, MCP config and agent definition were written by hand. The submission write-up lists which is which.
