# Call Pipeline: Requirements

## Scope

The call pipeline covers everything from the moment a call ends to the moment the owner receives a message card by email. It does not cover telephony setup or the dashboard UI.

## Requirements

### REQ-01: Audio ingestion

WHEN a call recording is delivered to the pipeline endpoint,
THE SYSTEM SHALL accept the audio file, assign it a unique call ID, and store it temporarily in Supabase Storage before beginning any processing.

Acceptance criteria:
- Every delivered audio file receives a unique ID that appears in all subsequent pipeline records for that call
- Audio is stored in a location accessible to the transcription step
- A call record with status "received" is written to the database before any async processing begins

### REQ-02: Empty and silent recording handling

WHEN the audio file is empty (zero bytes) or contains only silence for its entire duration,
THE SYSTEM SHALL create a message card with all extractable fields set to "unknown", set a flag `isSilentOrEmpty` to true, and still deliver the card to the owner.

Acceptance criteria:
- A zero-byte file does not cause a pipeline crash
- An audio file below the silence threshold (< -50 dBFS average) is classified as silent
- The delivered card explicitly shows "unknown" for name, callback number, and reason
- The email subject line indicates no message was left

### REQ-03: English transcription

WHEN the call audio is spoken in English,
THE SYSTEM SHALL produce a transcript that accurately reflects what was said, with word-error rate below 15% on a standard test set.

Acceptance criteria:
- Transcript language is detected or declared as English
- Numbers spoken aloud (phone numbers, dates) appear as digits in the transcript
- The transcript is stored verbatim before extraction begins

### REQ-04: German transcription

WHEN the call audio is spoken in German,
THE SYSTEM SHALL produce a German transcript using the same transcription service, without requiring the owner to configure language in advance.

Acceptance criteria:
- Language is auto-detected: no owner configuration required
- The German transcript is stored verbatim
- Extraction still produces an English-labelled card (field names in English, values in the caller's language if a name or address, callback number always as digits)

### REQ-05: Callback number must never be invented

WHEN extracting the callback number from a transcript,
THE SYSTEM SHALL set the callback number field to "unknown" if no phone number was spoken by the caller and no caller ID number was provided by the telephony carrier.

Acceptance criteria:
- The extraction prompt explicitly prohibits inventing or inferring a phone number
- A transcript containing no spoken number and no caller ID yields `callbackNumber: "unknown"`
- A transcript containing a partial number (e.g. only four digits) yields `callbackNumber: "unknown"` unless the remaining digits are available from caller ID
- A property-based test verifies that no transcript from a corpus of no-number examples ever produces a non-"unknown" callback number

### REQ-06: Explicit "unknown" for missing fields

WHEN a required field (caller name, callback number, reason, urgency) cannot be determined from the transcript or caller ID,
THE SYSTEM SHALL set that field to the string "unknown" rather than omitting the field or using null.

Acceptance criteria:
- The extracted card TypeScript type has no optional fields: every field is always present
- A transcript with no name spoken produces `callerName: "unknown"`
- A transcript with no discernible reason produces `reason: "unknown"`
- The Zod schema rejects any card object that has a missing or null required field

### REQ-07: Urgency classification

WHEN extracting urgency from the transcript,
THE SYSTEM SHALL assign exactly one of three levels: "low", "normal", or "high".

Acceptance criteria:
- "high" is assigned when the caller uses words indicating emergency, immediate need, or crisis (burst pipe, chest pain, business closed, cannot open)
- "normal" is the default when no urgency signals are present
- "low" is assigned when the caller explicitly says it is not urgent or can wait
- A property-based test verifies that no extraction result contains an urgency value outside the three allowed strings
- The urgency level is reflected in the email subject line for "high" calls

### REQ-08: Very long rambling messages

WHEN the call transcript exceeds 500 words,
THE SYSTEM SHALL still produce a complete card and MUST NOT truncate the transcript in the database.

Acceptance criteria:
- The extraction prompt instructs the model to summarise the reason to at most two sentences regardless of transcript length
- The full transcript is stored and accessible in the dashboard
- The card's reason field contains the summary, not the full transcript
- A test with a synthetic 2000-word rambling transcript confirms a non-"unknown" reason is extracted

### REQ-09: Transcription failure handling

WHEN the transcription service returns an error or times out,
THE SYSTEM SHALL mark the call as "transcription-failed", retain the audio for up to 24 hours (per privacy policy), and send the owner an email noting that a call was received but could not be transcribed.

Acceptance criteria:
- The call record status transitions to "transcription-failed" with a timestamp
- No card is created for a failed transcription
- The owner email includes the call timestamp and any available caller ID
- Audio is scheduled for deletion within 24 hours

### REQ-10: Extraction failure handling

WHEN the Claude API returns an invalid or unparseable response,
THE SYSTEM SHALL retry once after a 5-second delay, then fall back to a card where all fields are "unknown" and `extractionFailed` is set to true.

Acceptance criteria:
- At most one retry is attempted
- The fallback card is always a valid card according to the Zod schema
- The owner email for a fallback card includes a note that extraction failed and the raw transcript is attached
- No unhandled exception escapes the extraction step

### REQ-11: Email delivery within 30 seconds

WHEN a call is fully processed (transcription and extraction complete),
THE SYSTEM SHALL deliver the message card to the owner's registered email address within 30 seconds of the call ending.

Acceptance criteria:
- The pipeline end-to-end latency (call end to email send) is measured and logged per call
- Calls processed within the target appear in monitoring with status "delivered-on-time"
- Calls exceeding 30 seconds are logged as "delivered-late" but still delivered

### REQ-12: Audio deletion after transcription

WHEN transcription completes successfully,
THE SYSTEM SHALL delete the audio file from Supabase Storage immediately and record the deletion timestamp.

Acceptance criteria:
- The audio file is no longer accessible via its storage URL after deletion
- A deletion timestamp is recorded on the call record
- Deletion happens in the same transaction or immediate callback as transcription success, not in a separate scheduled job
