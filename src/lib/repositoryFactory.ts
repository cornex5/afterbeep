import type { CallsRepository } from "./repository";

export function getRepository(): CallsRepository {
  const useMemory =
    process.env["DEMO_MEMORY"] === "1" ||
    !process.env["SUPABASE_URL"];

  if (useMemory) {
    const { createMemoryRepository } = require("./adapters/memoryRepository") as {
      createMemoryRepository: () => CallsRepository;
    };
    return createMemoryRepository();
  }

  const { createSupabaseRepository } = require("./adapters/supabaseRepository") as {
    createSupabaseRepository: () => CallsRepository;
  };
  return createSupabaseRepository();
}
