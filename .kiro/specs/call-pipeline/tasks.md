# Call Pipeline: Tasks

## Implementation order

Work through these tasks in sequence. Each task is small enough to complete and test independently. Requirement references are in parentheses.

---

- [ ] **T01**: Create the Supabase migration for the `calls` table with all columns defined in design.md (REQ-01)

- [ ] **T02**: Create the Supabase migration for the `message_cards` table with all columns defined in design.md (REQ-06)

- [x] **T03**: Define the `MessageCardSchema` Zod schema and `MessageCard` TypeScript type in `src/lib/schema.ts` (REQ-06, REQ-07)

- [x] **T04**: Write property-based tests for the schema in `src/lib/schema.test.ts`: P2 (all fields present), P3 (urgency values), P6 (fallback card validity) (REQ-06, REQ-07, REQ-10)

- [x] **T05**: Implement `src/lib/audio.ts` with a `classifySilence(audioBuffer: Buffer): boolean` function that returns true for empty or sub-threshold audio (REQ-02)

- [x] **T06**: Write unit tests for `classifySilence` covering: zero-byte buffer, below-threshold buffer, normal audio buffer (REQ-02)

- [x] **T07**: Implement `src/lib/transcribe.ts` with a `transcribeAudio(audioBuffer: Buffer): Promise<TranscriptionResult>` function that calls the Whisper-class API and returns the transcript text and detected language (REQ-03, REQ-04)

- [x] **T08**: Write unit tests for `transcribeAudio` using a mocked API client: success with English, success with German, API error triggers correct error type (REQ-03, REQ-04, REQ-09)

- [x] **T09**: Implement `src/lib/extract.ts` with an `extractCard(transcript: string, callerIdNumber: string | null): Promise<MessageCard>` function including the retry logic and fallback card (REQ-05, REQ-06, REQ-07, REQ-08, REQ-10)

- [x] **T10**: Write the extraction prompt as a template string in `src/lib/extractionPrompt.ts` with three few-shot examples (English normal, German, no-number) (REQ-05, REQ-06, REQ-07)

- [x] **T11**: Write property-based tests for `extractCard` covering: P1 (no invented numbers), P3 (urgency enum), P7 (German transcripts), P8 (long transcript reason length) (REQ-05, REQ-07, REQ-04, REQ-08)

- [x] **T12**: Write a unit test for `extractCard` with a 2000-word synthetic rambling transcript to confirm reason is extracted and summarised (REQ-08)

- [ ] **T13**: Implement `src/lib/email.ts` with a `renderCardEmail(card: MessageCard, callMeta: CallMeta): string` function that returns the HTML email body (REQ-11)

- [ ] **T14**: Write unit tests for `renderCardEmail` covering: normal card, all-unknown fallback card, high-urgency card subject line, extraction-failed card with transcript attachment note (REQ-06, REQ-07, REQ-10, REQ-11)

- [ ] **T15**: Implement the ingest API route at `src/app/api/calls/ingest/route.ts`: validate content type and size, write call record, upload audio to Storage, enqueue transcription (REQ-01, REQ-09)

- [ ] **T16**: Implement the transcription worker in `src/app/api/calls/transcribe/route.ts` or as a Supabase Edge Function: download audio, call `transcribeAudio`, store transcript, delete audio, enqueue extraction (REQ-03, REQ-04, REQ-09, REQ-12)

- [ ] **T17**: Implement the extraction worker: read transcript, call `extractCard`, write message card to database, enqueue email delivery (REQ-05, REQ-06, REQ-07, REQ-08, REQ-10)

- [ ] **T18**: Implement the email delivery worker: read card and call metadata, call `renderCardEmail`, send via SMTP provider, record delivery timestamp (REQ-11)

- [ ] **T19**: Add pipeline latency logging: record timestamps at each stage transition and log when end-to-end exceeds 30 seconds (REQ-11)

- [ ] **T20**: Write an integration test that runs the full pipeline with a short English audio fixture and asserts: audio deleted, card written, all fields present, urgency is valid enum value (REQ-01, REQ-03, REQ-05, REQ-06, REQ-07, REQ-12)

- [ ] **T21**: Write an integration test for the silent/empty audio path: zero-byte input produces an all-unknown card with `isSilentOrEmpty: true` (REQ-02)

- [ ] **T22**: Write an integration test for the transcription failure path: mocked API error produces a "transcription-failed" call record and a failure email (REQ-09)
