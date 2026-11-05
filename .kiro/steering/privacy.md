# Afterbeep: Privacy

## Audio retention

Call audio is deleted from storage as soon as transcription succeeds. If transcription fails, audio is retained for up to 24 hours to allow a retry, then deleted regardless. Audio is never stored longer than 24 hours under any circumstance.

## Transcript retention

Transcripts and message cards are kept for 30 days from the date of the call. After 30 days they are permanently deleted. Owners can delete individual records at any time before expiry.

## Phone numbers

Phone numbers are stored only from two sources:

1. What the caller spoke aloud (extracted from the transcript verbatim)
2. The caller ID provided by the telephony carrier

Afterbeep never guesses, constructs, or infers a phone number from partial information. If neither source yields a number, the callback number field is stored and displayed as "unknown". This is non-negotiable and must be enforced at the extraction layer with a hard rule, not just a soft instruction.

## AI disclosure

Every call answered by Afterbeep begins with an audible disclosure line, spoken before recording starts:

> "You have reached an automated answering service. This call will be recorded and transcribed by AI. Please leave your name, number, and message after the tone."

This disclosure is not skippable and not configurable by the owner.

## Data access

Each owner accesses only their own calls. Row-level security in Supabase enforces this at the database layer, not just the application layer.

## No training use

Call audio, transcripts, and message cards are never sent to any AI provider for training purposes. API calls use provider settings that opt out of training data collection where such options exist.

## GDPR note

Afterbeep operates as a data processor on behalf of the small business owner (the data controller). The owner is responsible for informing their callers about recording practices in accordance with applicable law. Afterbeep provides the AI disclosure line as a technical aid, not as legal compliance advice.
