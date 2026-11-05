import { createClient } from "@supabase/supabase-js";
import type { AudioStore } from "../ports";

const BUCKET = "calls";

function audioPath(callId: string): string {
  return `${callId}/audio`;
}

function makeClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  return createClient(url, key);
}

export function createSupabaseAudioStore(): AudioStore {
  const client = makeClient();

  return {
    async put(callId: string, audio: Buffer): Promise<void> {
      const { error } = await client.storage
        .from(BUCKET)
        .upload(audioPath(callId), audio, { upsert: true });
      if (error) throw new Error(error.message);
    },

    async get(callId: string): Promise<Buffer> {
      const { data, error } = await client.storage
        .from(BUCKET)
        .download(audioPath(callId));
      if (error) throw new Error(error.message);
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },

    async delete(callId: string): Promise<void> {
      const { error } = await client.storage
        .from(BUCKET)
        .remove([audioPath(callId)]);
      if (error) throw new Error(error.message);
    },
  };
}
