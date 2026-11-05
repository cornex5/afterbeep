import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCookieValue } from "./demoSession";

const COOKIE_NAME = "ab_demo";

export async function getOwnerId(): Promise<string> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME);

  if (!cookie) {
    redirect("/demo/start");
  }

  const ownerId = verifyCookieValue(cookie.value);

  if (!ownerId) {
    redirect("/demo/start");
  }

  return ownerId;
}
