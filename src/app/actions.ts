"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/repositoryFactory";
import type { OwnerSettings } from "@/lib/repository";

const OWNER_ID = "demo";

export async function markHandledAction(
  callId: string,
  handled: boolean,
): Promise<void> {
  const repo = getRepository();
  await repo.markHandled(callId, OWNER_ID, handled);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/calls/${callId}`);
}

export async function saveSettingsAction(
  settings: OwnerSettings,
): Promise<void> {
  const repo = getRepository();
  await repo.saveSettings(OWNER_ID, settings);
  revalidatePath("/dashboard/settings");
}
