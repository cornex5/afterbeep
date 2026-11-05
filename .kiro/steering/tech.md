# Afterbeep: Tech Stack

## Runtime and framework

- Next.js with App Router, TypeScript strict mode
- Deployed on Vercel (serverless functions for API routes, edge for lightweight middleware)

## Storage

- Supabase (Postgres) for all persistent data: call records, message cards, owner settings
- Supabase Storage for temporary audio files (deleted after transcription, see privacy.md)
- Row-level security on all tables: each owner sees only their own data

## AI services

- Whisper-class speech-to-text API for transcription (language: auto-detect, supports English and German)
- Claude API for structured extraction: turns a raw transcript into a message card with defined fields

## Testing

- Vitest for unit and integration tests
- fast-check for property-based tests, especially for extraction correctness guarantees

## Code boundaries

Pure logic lives in `src/lib`. Files under `src/lib` must not import from Next.js, React, or any other framework. This keeps the core pipeline testable without a running server.

API route handlers live in `src/app/api`. UI components live in `src/components`. Each layer imports only downward: UI imports from lib, lib imports nothing from UI or framework.

## Environment

All secrets (API keys, Supabase URL, SMTP credentials) are environment variables. No secret is ever hardcoded or committed.
