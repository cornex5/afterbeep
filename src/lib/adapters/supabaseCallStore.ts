import { createClient } from "@supabase/supabase-js";
import type { CallRecord, CallStatus, CallStore, NewCallInput } from "../ports";
import type { MessageCard } from "../schema";

function makeClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key);
}

export function createSupabaseCallStore(): CallStore {
  const client = makeClient();

  return {
    async insertCall(input: NewCallInput): Promise<string> {
      const { data, error } = await client
        .from("calls")
        .insert({
          owner_id: input.ownerId,
          caller_id_number: input.callerIdNumber,
          received_at: input.receivedAt.toISOString(),
          status: "received",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return (data as { id: string }).id;
    },

    async updateStatus(callId: string, status: CallStatus): Promise<void> {
      const { error } = await client
        .from("calls")
        .update({ status })
        .eq("id", callId);
      if (error) throw new Error(error.message);
    },

    async setTranscript(
      callId: string,
      transcript: string,
      language: string,
      isSilentOrEmpty: boolean,
    ): Promise<void> {
      const { error } = await client
        .from("calls")
        .update({
          transcript,
          transcript_language: language,
          is_silent_or_empty: isSilentOrEmpty,
        })
        .eq("id", callId);
      if (error) throw new Error(error.message);
    },

    async setAudioDeletedAt(callId: string, at: Date): Promise<void> {
      const { error } = await client
        .from("calls")
        .update({ audio_deleted_at: at.toISOString() })
        .eq("id", callId);
      if (error) throw new Error(error.message);
    },

    async setDeliveredAt(callId: string, at: Date): Promise<void> {
      const { error } = await client
        .from("calls")
        .update({ delivered_at: at.toISOString() })
        .eq("id", callId);
      if (error) throw new Error(error.message);
    },

    async insertCard(
      callId: string,
      ownerId: string,
      card: MessageCard,
      receivedAt: Date,
    ): Promise<void> {
      const expiresAt = new Date(receivedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { error } = await client.from("message_cards").insert({
        call_id: callId,
        owner_id: ownerId,
        caller_name: card.callerName,
        callback_number: card.callbackNumber,
        reason: card.reason,
        urgency: card.urgency,
        suggested_reply: card.suggestedReply,
        expires_at: expiresAt.toISOString(),
      });
      if (error) throw new Error(error.message);
    },

    async readCall(callId: string): Promise<CallRecord | null> {
      const { data, error } = await client
        .from("calls")
        .select("*")
        .eq("id", callId)
        .single();
      if (error) return null;
      const row = data as Record<string, unknown>;
      return {
        id: row["id"] as string,
        ownerId: row["owner_id"] as string,
        receivedAt: new Date(row["received_at"] as string),
        status: row["status"] as CallStatus,
        callerIdNumber: (row["caller_id_number"] as string | null) ?? null,
        transcript: (row["transcript"] as string | null) ?? null,
        transcriptLanguage: (row["transcript_language"] as string | null) ?? null,
        audioDeletedAt: row["audio_deleted_at"]
          ? new Date(row["audio_deleted_at"] as string)
          : null,
        deliveredAt: row["delivered_at"]
          ? new Date(row["delivered_at"] as string)
          : null,
        isSilentOrEmpty: (row["is_silent_or_empty"] as boolean) ?? false,
        extractionFailed: (row["extraction_failed"] as boolean) ?? false,
      };
    },
  };
}
