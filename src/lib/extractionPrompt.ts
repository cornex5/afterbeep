export function buildExtractionPrompt(transcript: string, callerIdNumber: string | null): string {
  const callerIdLine =
    callerIdNumber !== null
      ? `Carrier caller ID: ${callerIdNumber}`
      : "Carrier caller ID: not available";

  return `You are extracting a structured message card from a voicemail transcript. Return only a JSON object. No markdown, no explanation, no preamble.

Rules:
- callerName: the name the caller gave, or "unknown" if they did not say their name
- callbackNumber: use the phone number the caller spoke aloud. If they did not say one, use the carrier caller ID if available. If neither source gives a number, use exactly the string "unknown". Never guess, construct, or infer a number.
- reason: a summary of why they called, in at most two sentences. Use "unknown" if no reason was given.
- urgency: "high" if the caller signals an emergency, immediate crisis, or the situation cannot wait. "low" if the caller explicitly says it is not urgent or can wait. "normal" in all other cases.
- suggestedReply: a short draft reply the owner could send or say. At most two sentences.
- isSilentOrEmpty: false unless the transcript is empty or contains only silence.
- extractionFailed: false.

Example 1 (English, number spoken):
Transcript: "Hi, this is Sarah calling from Manchester. I have a burst pipe in my kitchen, water is everywhere. Please call me back urgently on 07700 900123. Thanks."
Caller ID: 07700900456
Output:
{"callerName":"Sarah","callbackNumber":"07700900123","reason":"The caller has a burst pipe in her kitchen and needs urgent assistance.","urgency":"high","suggestedReply":"Hi Sarah, I got your message about the burst pipe. I will call you right back.","isSilentOrEmpty":false,"extractionFailed":false}

Example 2 (German, no number spoken, caller ID available):
Transcript: "Hallo, hier ist Thomas Mueller. Ich wollte wegen eines Kostenvoranschlags fuer die Dachrinnenreparatur anfragen. Kein Stress, ich bin die ganze Woche erreichbar."
Caller ID: 015112345678
Output:
{"callerName":"Thomas Mueller","callbackNumber":"015112345678","reason":"Der Anrufer moechte einen Kostenvoranschlag fuer eine Dachrinnenreparatur.","urgency":"low","suggestedReply":"Hallo Herr Mueller, danke fuer Ihre Nachricht. Ich melde mich bald mit einem Angebot.","isSilentOrEmpty":false,"extractionFailed":false}

Example 3 (no number anywhere):
Transcript: "Hey, just calling to see if you can fit me in for a haircut this week. No rush. Give me a ring when you get a chance."
Caller ID: not available
Output:
{"callerName":"unknown","callbackNumber":"unknown","reason":"The caller wants to book a haircut appointment this week.","urgency":"low","suggestedReply":"Hi, thanks for calling. I don't have your number, so please call again and I'll get you booked in.","isSilentOrEmpty":false,"extractionFailed":false}

Now extract from:
${callerIdLine}
Transcript: "${transcript.replace(/"/g, '\\"')}"
Output:`;
}
