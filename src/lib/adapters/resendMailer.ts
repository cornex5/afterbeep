import type { MailPayload, Mailer } from "../ports";

type ResendResponse = {
  id?: string;
  error?: { message: string };
};

export function createResendMailer(): Mailer {
  return {
    async send(payload: MailPayload): Promise<void> {
      const apiKey = process.env["RESEND_API_KEY"];
      const from = process.env["MAIL_FROM"];
      if (!apiKey || !from) {
        throw new Error("RESEND_API_KEY and MAIL_FROM must be set");
      }

      const body = JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        let detail = response.statusText;
        try {
          const parsed = (await response.json()) as ResendResponse;
          if (parsed.error?.message) detail = parsed.error.message;
        } catch {
        }
        throw new Error(`Resend API error ${response.status}: ${detail}`);
      }
    },
  };
}
