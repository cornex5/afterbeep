import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyCookieValue } from "@/lib/demoSession";
import { createSupabaseCallStore } from "@/lib/adapters/supabaseCallStore";

const COOKIE_NAME = "ab_demo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);
  if (!cookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const ownerId = verifyCookieValue(cookie.value);
  if (!ownerId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { id } = await context.params;

  const callStore = createSupabaseCallStore();
  const record = await callStore.readCall(id);

  if (!record || record.ownerId !== ownerId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ status: record.status });
}
