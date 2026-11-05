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
        .from("owners")
        .select("notification_email")
        .eq("id", ownerId)
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
        .from("owners")
        .upsert({
          id: ownerId,
          notification_email: settings.notificationEmail,
        });

      if (error) throw new Error(error.message);
    },
  };
}
