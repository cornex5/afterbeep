"use server";

import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/repositoryFactory";
import { getOwnerId } from "@/lib/session";
import type { OwnerSettings } from "@/lib/repository";

export async function markHandledAction(
  callId: string,
  handled: boolean,
): Promise<void> {
  const ownerId = await getOwnerId();
  const repo = getRepository();
  await repo.markHandled(callId, ownerId, handled);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/calls/${callId}`);
}

export async function saveSettingsAction(
  settings: OwnerSettings,
): Promise<void> {
  const ownerId = await getOwnerId();
  const repo = getRepository();
  await repo.saveSettings(ownerId, settings);
  revalidatePath("/dashboard/settings");
}
