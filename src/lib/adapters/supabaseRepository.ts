import { createClient } from "@supabase/supabase-js";
import type {
  CallsRepository,
  CallSummary,
  CallDetail,
  OwnerSettings,
} from "../repository";
import type { Urgency } from "../schema";

function makeClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key)
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key);
}

type CallRow = {
  id: string;
  received_at: string;
  caller_id_number: string | null;
  transcript: string | null;
  transcript_language: string | null;
};

type CardRow = {
  caller_name: string;
  callback_number: string;
  reason: string;
  urgency: string;
  suggested_reply: string;
  handled_at: string | null;
  expires_at: string;
  is_silent_or_empty: boolean;
  extraction_failed: boolean;
};

type JoinedRow = CallRow & CardRow;

function rowToSummary(row: JoinedRow): CallSummary {
  return {
    id: row.id,
    receivedAt: new Date(row.received_at),
    callerName: row.caller_name,
    callbackNumber: row.callback_number,
    reason: row.reason,
    urgency: row.urgency as Urgency,
    handledAt: row.handled_at ? new Date(row.handled_at) : null,
    expiresAt: new Date(row.expires_at),
    transcriptLanguage: row.transcript_language,
    callerIdNumber: row.caller_id_number,
  };
}

function rowToDetail(row: JoinedRow): CallDetail {
  return {
    ...rowToSummary(row),
    transcript: row.transcript,
    suggestedReply: row.suggested_reply,
    isSilentOrEmpty: row.is_silent_or_empty,
    extractionFailed: row.extraction_failed,
  };
}

type SeedCall = {
  ownerId: string;
  callerName: string;
  callbackNumber: string;
  callerIdNumber: string | null;
  reason: string;
  urgency: Urgency;
  handledAt: Date | null;
  expiresAt: Date;
  transcriptLanguage: string;
  transcript: string;
  suggestedReply: string;
};

function makeSeedData(ownerId: string): SeedCall[] {
  const now = new Date();
  const expires = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const ago = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000);

  return [
    {
      ownerId,
      callerName: "Thomas Berger",
      callbackNumber: "+49 30 5550 0112",
      callerIdNumber: "+4930555001 12",
      reason: "Burst pipe in the basement, water coming in fast",
      urgency: "high",
      handledAt: null,
      expiresAt: expires(28),
      transcriptLanguage: "de",
      transcript:
        "Hallo, hier ist Thomas Berger. Ich habe ein ernstes Problem: in meinem Keller platzt gerade ein Rohr und Wasser quillt heraus. Bitte rufen Sie mich so schnell wie moeglich zurueck. Meine Nummer ist 030 5550 0112. Das ist sehr dringend.",
      suggestedReply:
        "Hallo Herr Berger, wir haben Ihre Nachricht erhalten. Wir melden uns innerhalb der naechsten Stunde bei Ihnen.",
    },
    {
      ownerId,
      callerName: "Sandra Koch",
      callbackNumber: "+49 30 5550 0234",
      callerIdNumber: "+49305550023 4",
      reason: "Boiler showing error code E4, no heating or hot water",
      urgency: "high",
      handledAt: null,
      expiresAt: expires(29),
      transcriptLanguage: "de",
      transcript:
        "Guten Tag, mein Name ist Sandra Koch. Meine Heizung zeigt den Fehlercode E4 an und ich habe weder Heizung noch warmes Wasser. Kinder im Haus. Telefon: 030 5550 0234. Bitte bald melden.",
      suggestedReply:
        "Hallo Frau Koch, wir kommen heute noch vorbei. Bitte halten Sie das Geraetemodell bereit.",
    },
    {
      ownerId,
      callerName: "Marcus Webb",
      callbackNumber: "+1 555 0187",
      callerIdNumber: "+15550187",
      reason: "Requesting a quote for rewiring the kitchen",
      urgency: "normal",
      handledAt: null,
      expiresAt: expires(27),
      transcriptLanguage: "en",
      transcript:
        "Hi, this is Marcus Webb calling. I'd like to get a quote for rewiring my kitchen. I'm doing a full renovation and need the electrical sorted out. My number is 1 555 0187. No rush, just whenever you get a chance.",
      suggestedReply:
        "Hi Marcus, thanks for calling. We'll give you a ring to arrange a site visit.",
    },
    {
      ownerId,
      callerName: "unknown",
      callbackNumber: "unknown",
      callerIdNumber: null,
      reason: "Dentist appointment reschedule request, Tuesday at 3pm",
      urgency: "normal",
      handledAt: null,
      expiresAt: expires(26),
      transcriptLanguage: "en",
      transcript:
        "Hello, I need to reschedule my dentist appointment. I have a Tuesday at three pm and I can't make it. I didn't leave my number but I'll call back. Thanks.",
      suggestedReply:
        "Thanks for calling. Since we don't have a number for you, please call us back so we can rebook.",
    },
    {
      ownerId,
      callerName: "DHL Delivery",
      callbackNumber: "+49 30 5550 0800",
      callerIdNumber: "+4930555008 00",
      reason: "Missed delivery window, parcel at depot, ref 7741882",
      urgency: "low",
      handledAt: null,
      expiresAt: expires(3),
      transcriptLanguage: "de",
      transcript:
        "Hallo, hier spricht der Kundendienst von DHL. Wir konnten Ihr Paket heute nicht zustellen. Das Paket liegt bei unserer Filiale. Sendungsnummer 7741882. Bitte melden Sie sich unter 030 5550 0800.",
      suggestedReply:
        "Danke fuer Ihren Anruf. Wir melden uns wegen der Abholung.",
    },
    {
      ownerId,
      callerName: "Priya Sharma",
      callbackNumber: "+1 555 0142",
      callerIdNumber: "+15550142",
      reason: "Annual boiler service booking",
      urgency: "low",
      handledAt: ago(900),
      expiresAt: expires(25),
      transcriptLanguage: "en",
      transcript:
        "Hi, this is Priya Sharma. I'd like to book the annual boiler service we talked about last year. My number is 1 555 0142. Mornings work best for me. Thank you.",
      suggestedReply:
        "Hi Priya, great to hear from you. We'll call to pick a morning slot.",
    },
    {
      ownerId,
      callerName: "James Okafor",
      callbackNumber: "+1 555 0163",
      callerIdNumber: "+15550163",
      reason: "Leaking tap in the bathroom, not urgent",
      urgency: "low",
      handledAt: ago(2400),
      expiresAt: expires(20),
      transcriptLanguage: "en",
      transcript:
        "Hello, James Okafor here. Got a tap dripping in the bathroom. Not urgent but would like it sorted in the next couple of weeks. Number is 1 555 0163. Cheers.",
      suggestedReply:
        "Hi James, no problem. We'll be in touch to schedule a convenient time.",
    },
  ];
}

export function createSupabaseRepository(): CallsRepository {
  const client = makeClient();

  return {
    async listCalls(ownerId: string): Promise<CallSummary[]> {
      const { data, error } = await client
        .from("calls")
        .select(
          `id, received_at, caller_id_number,
           message_cards!inner(
             caller_name, callback_number, reason, urgency,
             suggested_reply, handled_at, expires_at,
             is_silent_or_empty, extraction_failed
           )`,
        )
        .eq("owner_id", ownerId)
        .gt("message_cards.expires_at", new Date().toISOString())
        .order("received_at", { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown[];
      return rows.flatMap((row) => {
        const r = row as Record<string, unknown>;
        const cards = r["message_cards"] as CardRow[] | CardRow;
        const card = Array.isArray(cards) ? cards[0] : cards;
        if (!card) return [];
        return [
          rowToSummary({
            id: r["id"] as string,
            received_at: r["received_at"] as string,
            caller_id_number: r["caller_id_number"] as string | null,
            transcript: null,
            transcript_language: null,
            ...card,
          }),
        ];
      });
    },

    async getCall(
      callId: string,
      ownerId: string,
    ): Promise<CallDetail | null> {
      const { data, error } = await client
        .from("calls")
        .select(
          `id, received_at, caller_id_number, transcript, transcript_language,
           message_cards!inner(
             caller_name, callback_number, reason, urgency,
             suggested_reply, handled_at, expires_at,
             is_silent_or_empty, extraction_failed
           )`,
        )
        .eq("id", callId)
        .eq("owner_id", ownerId)
        .single();

      if (error) return null;

      const r = data as Record<string, unknown>;
      const cards = r["message_cards"] as CardRow[] | CardRow;
      const card = Array.isArray(cards) ? cards[0] : cards;
      if (!card) return null;

      return rowToDetail({
        id: r["id"] as string,
        received_at: r["received_at"] as string,
        caller_id_number: r["caller_id_number"] as string | null,
        transcript: (r["transcript"] as string | null) ?? null,
        transcript_language:
          (r["transcript_language"] as string | null) ?? null,
        ...card,
      });
    },

    async markHandled(
      callId: string,
      ownerId: string,
      handled: boolean,
    ): Promise<void> {
      const { error } = await client
        .from("message_cards")
        .update({ handled_at: handled ? new Date().toISOString() : null })
        .eq("call_id", callId)
        .eq("owner_id", ownerId);

      if (error) throw new Error(error.message);
    },

    async getSettings(ownerId: string): Promise<OwnerSettings> {
      const { data, error } = await client
        .from("owner_settings")
        .select("notification_email")
        .eq("owner_id", ownerId)
        .single();

      if (error) return { notificationEmail: "" };

      const row = data as Record<string, unknown>;
      return {
        notificationEmail: (row["notification_email"] as string) ?? "",
      };
    },

    async saveSettings(
      ownerId: string,
      settings: OwnerSettings,
    ): Promise<void> {
      const { error } = await client
        .from("owner_settings")
        .upsert({
          owner_id: ownerId,
          notification_email: settings.notificationEmail,
        });

      if (error) throw new Error(error.message);
    },

    async seedDemo(ownerId: string): Promise<void> {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await client
        .from("calls")
        .delete()
        .eq("owner_id", ownerId)
        .lt("received_at", cutoff);

      await client
        .from("owner_settings")
        .upsert({ owner_id: ownerId, notification_email: "" });

      const seedCalls = makeSeedData(ownerId);

      for (const seed of seedCalls) {
        const { data: callData, error: callError } = await client
          .from("calls")
          .insert({
            owner_id: seed.ownerId,
            caller_id_number: seed.callerIdNumber,
            received_at: new Date(Date.now() - Math.random() * 1000).toISOString(),
            status: "delivered",
            transcript: seed.transcript,
            transcript_language: seed.transcriptLanguage,
            is_silent_or_empty: false,
            extraction_failed: false,
          })
          .select("id")
          .single();

        if (callError || !callData) continue;

        const callId = (callData as { id: string }).id;

        await client.from("message_cards").insert({
          call_id: callId,
          owner_id: seed.ownerId,
          caller_name: seed.callerName,
          callback_number: seed.callbackNumber,
          reason: seed.reason,
          urgency: seed.urgency,
          suggested_reply: seed.suggestedReply,
          handled_at: seed.handledAt ? seed.handledAt.toISOString() : null,
          expires_at: seed.expiresAt.toISOString(),
        });
      }
    },
  };
}
