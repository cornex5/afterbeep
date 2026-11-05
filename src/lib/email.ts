import type { MessageCard } from "./schema";

export type CallMeta = {
  callId: string;
  receivedAt: Date;
  callerIdNumber: string | null;
  transcriptLanguage: string | null;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const COLORS = {
  bg: "#F5F0E8",
  text: "#1C1C1A",
  accent: "#C0392B",
  border: "#D6CFC0",
};

function formatDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function urgencyLabel(urgency: MessageCard["urgency"]): string {
  if (urgency === "high") return "HIGH URGENCY";
  if (urgency === "low") return "low urgency";
  return "normal";
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderCardEmail(card: MessageCard, meta: CallMeta): RenderedEmail {
  const urgencyPrefix = card.urgency === "high" ? "[HIGH URGENCY] " : "";
  const subject = `${urgencyPrefix}New message from ${card.callerName} (${formatDate(meta.receivedAt)})`;

  const urgencyColor = card.urgency === "high" ? COLORS.accent : COLORS.text;
  const callerIdLine =
    meta.callerIdNumber !== null ? meta.callerIdNumber : "not available";
  const languageLine =
    meta.transcriptLanguage !== null ? meta.transcriptLanguage : "unknown";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="background:${COLORS.bg};color:${COLORS.text};font-family:monospace;margin:0;padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td>
<table width="100%" cellpadding="16" cellspacing="0"
  style="border:1px solid ${COLORS.border};border-radius:4px;background:#fff;">
<tr>
  <td style="border-bottom:1px solid ${COLORS.border};padding-bottom:12px;">
    <span style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#888;">
      new message
    </span>
    <br>
    <span style="font-size:18px;font-weight:600;">${escapeHtml(card.callerName)}</span>
    <span style="float:right;font-size:11px;color:${urgencyColor};font-weight:600;letter-spacing:0.06em;">
      ${escapeHtml(urgencyLabel(card.urgency))}
    </span>
  </td>
</tr>
<tr>
  <td>
    <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;">
    <tr>
      <td style="color:#888;width:160px;">callback number</td>
      <td style="font-weight:600;">${escapeHtml(card.callbackNumber)}</td>
    </tr>
    <tr>
      <td style="color:#888;">caller id</td>
      <td>${escapeHtml(callerIdLine)}</td>
    </tr>
    <tr>
      <td style="color:#888;">received</td>
      <td>${escapeHtml(formatDate(meta.receivedAt))}</td>
    </tr>
    <tr>
      <td style="color:#888;">language</td>
      <td>${escapeHtml(languageLine)}</td>
    </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="border-top:1px solid ${COLORS.border};padding-top:12px;">
    <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">message</span>
    <p style="margin:8px 0 0;font-size:14px;line-height:1.6;">${escapeHtml(card.reason)}</p>
  </td>
</tr>
<tr>
  <td style="border-top:1px solid ${COLORS.border};padding-top:12px;">
    <span style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;">suggested reply</span>
    <p style="margin:8px 0 0;font-size:13px;color:#555;font-style:italic;line-height:1.6;">
      ${escapeHtml(card.suggestedReply)}
    </p>
  </td>
</tr>
${
  card.extractionFailed
    ? `<tr>
  <td style="border-top:1px solid ${COLORS.border};padding-top:12px;color:${COLORS.accent};">
    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">extraction note</span>
    <p style="margin:8px 0 0;font-size:13px;line-height:1.6;">
      Automatic extraction failed. The raw transcript is attached. Please review it directly.
    </p>
  </td>
</tr>`
    : ""
}
<tr>
  <td style="border-top:1px solid ${COLORS.border};padding-top:12px;">
    <span style="font-size:11px;color:#888;">call id: ${escapeHtml(meta.callId)}</span>
  </td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const extractionNote = card.extractionFailed
    ? "\nNOTE: Automatic extraction failed. The raw transcript is attached. Please review it directly.\n"
    : "";

  const text = `New message from ${card.callerName}
Received: ${formatDate(meta.receivedAt)}
Urgency: ${urgencyLabel(card.urgency)}

Callback number: ${card.callbackNumber}
Caller ID: ${callerIdLine}
Language: ${languageLine}

Message:
${card.reason}

Suggested reply:
${card.suggestedReply}
${extractionNote}
Call ID: ${meta.callId}
`;

  return { subject, html, text };
}
