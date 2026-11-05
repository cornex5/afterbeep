# Call Pipeline: Design

## Data flow

```
Telephony carrier
      |
      | POST /api/calls/ingest  (audio file + metadata)
      v
[Ingest handler]
  - Validates content type and size
  - Assigns callId (UUID)
  - Writes call record (status: "received") to Postgres
  - Uploads audio to Supabase Storage at calls/{callId}/audio
  - Enqueues transcription job
  - Returns 200 immediately
      |
      v
[Transcription worker]
  - Downloads audio from Storage
  - Sends to Whisper-class API (language: auto)
  - On success: stores transcript text on call record, deletes audio from Storage, updates status to "transcribed"
  - On failure: updates status to "transcription-failed", schedules audio deletion in 24h, sends failure email
      |
      v
[Extraction worker]
  - Reads transcript from call record
  - Sends to Claude API with structured extraction prompt
  - Validates response with Zod schema
  - On valid response: writes MessageCard to database, updates call status to "extracted"
  - On invalid response: retries once after 5 seconds
  - On second failure: writes fallback card (all fields "unknown", extractionFailed: true), updates status to "extraction-failed"
      |
      v
[Email worker]
  - Reads MessageCard from database
  - Renders email template
  - Sends via SMTP / transactional email provider
  - Records delivery timestamp, updates call status to "delivered"
```

## Database schema

### calls table

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| owner_id | uuid | foreign key to owners table |
| received_at | timestamptz | when the ingest endpoint was called |
| status | text | enum: received, transcribed, extracted, delivered, transcription-failed, extraction-failed |
| caller_id_number | text | carrier-provided caller ID, may be null |
| transcript | text | raw transcript text, null until transcribed |
| transcript_language | text | detected language code (en, de, etc.) |
| audio_deleted_at | timestamptz | null until audio is deleted |
| delivered_at | timestamptz | null until email sent |
| is_silent_or_empty | boolean | set by transcription worker |
| extraction_failed | boolean | set when fallback card is used |

### message_cards table

| column | type | notes |
|---|---|---|
| id | uuid | primary key |
| call_id | uuid | foreign key to calls |
| owner_id | uuid | foreign key to owners |
| caller_name | text | "unknown" if not found |
| callback_number | text | "unknown" if not found |
| reason | text | "unknown" if not found, max 2-sentence summary |
| urgency | text | "low", "normal", or "high" |
| suggested_reply | text | draft reply for the owner |
| extracted_at | timestamptz | |
| handled_at | timestamptz | null until owner marks handled |
| expires_at | timestamptz | received_at + 30 days |

## Extraction schema

```typescript
import { z } from "zod"

const Urgency = z.enum(["low", "normal", "high"])

export const MessageCardSchema = z.object({
  callerName: z.string().min(1),
  callbackNumber: z.string().min(1),
  reason: z.string().min(1),
  urgency: Urgency,
  suggestedReply: z.string().min(1),
  isSilentOrEmpty: z.boolean(),
  extractionFailed: z.boolean(),
})

export type MessageCard = z.infer<typeof MessageCardSchema>

export type Urgency = z.infer<typeof Urgency>
```

Key invariants enforced by the schema:
- No field is optional or nullable: every field must be present with a non-empty string value
- The only valid urgency values are the three enum members
- `callerName: "unknown"`, `callbackNumber: "unknown"`, etc. are valid and expected when the field cannot be determined

## Extraction prompt design

The extraction prompt instructs Claude to:
1. Read the transcript and any caller ID number provided
2. Fill each field using only information present in the transcript or caller ID
3. For the callback number: use the spoken number if present, fall back to caller ID if present, otherwise return exactly the string "unknown", no exceptions
4. For urgency: classify as "high" for emergencies or immediate crises, "low" when the caller says it can wait, "normal" otherwise
5. Return a JSON object conforming to the schema above, nothing else

The prompt includes three few-shot examples covering: a normal call in English, a German call, and a call with no phone number.

## Error handling

| failure point | behaviour |
|---|---|
| Ingest: audio too large | Reject with 413, no record written |
| Ingest: invalid content type | Reject with 400, no record written |
| Transcription: service error | Retry once, then mark transcription-failed, notify owner |
| Transcription: empty/silent audio | Mark is_silent_or_empty, continue to extraction with empty transcript |
| Extraction: invalid JSON from Claude | Retry once after 5s, then write fallback card |
| Extraction: Zod parse failure | Treat same as invalid JSON |
| Email: delivery failure | Retry up to 3 times with exponential backoff, log permanent failure |

All failures write a status and timestamp to the call record. No failure is silent.

## Correctness Properties

These properties are suitable for property-based testing with fast-check. Each property should hold for any input in the described domain.

**P1: callbackNumber is never invented.**
For any transcript that contains no sequence of digits resembling a phone number, and where callerIdNumber is null, the extracted card always has `callbackNumber === "unknown"`.

**P2: All fields are always present.**
For any transcript (including empty string, whitespace-only, random unicode), the extraction function returns a MessageCard where every field is a non-empty string (or boolean for flags). No field is ever undefined, null, or empty string.

**P3: Urgency is always one of three values.**
For any transcript, the urgency field of the extracted card is always exactly one of "low", "normal", or "high".

**P4: Silent/empty audio produces all-unknown card.**
For any audio input classified as silent or empty, the resulting card has `callerName === "unknown"`, `callbackNumber === "unknown"`, `reason === "unknown"`, and `isSilentOrEmpty === true`.

**P5: Extraction is idempotent on the same transcript.**
Given the same transcript and caller ID input, the extraction function returns a card with the same urgency and isSilentOrEmpty values (non-deterministic fields like suggestedReply are excluded from this property).

**P6: Fallback card always passes schema validation.**
The fallback card produced on extraction failure always satisfies MessageCardSchema.safeParse with no errors.

**P7: German transcripts produce valid cards.**
For any German-language transcript, the extraction function returns a card where all required fields are present and urgency is a valid enum value.

**P8: Long transcripts produce short reason fields.**
For any transcript longer than 500 words, the reason field of the extracted card contains at most 2 sentences (measured by sentence-ending punctuation count).
