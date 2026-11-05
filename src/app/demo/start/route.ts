import { type NextRequest, NextResponse } from "next/server";
import { signOwnerId, verifyCookieValue } from "@/lib/demoSession";
import { getRepository } from "@/lib/repositoryFactory";

const COOKIE_NAME = "ab_demo";
const MAX_AGE_SECONDS = 86400;
const MAX_STARTS_PER_IP_10MIN = 6;

const startTimestamps = new Map<string, number[]>();

function resolveIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

function allowStart(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - 10 * 60_000;
  const times = (startTimestamps.get(ip) ?? []).filter((t) => t > cutoff);
  if (times.length >= MAX_STARTS_PER_IP_10MIN) return false;
  times.push(now);
  startTimestamps.set(ip, times);
  return true;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const existing = request.cookies.get(COOKIE_NAME)?.value;
  if (existing && verifyCookieValue(existing)) {
    return NextResponse.redirect(new URL("/dashboard", request.url), 302);
  }

  if (!allowStart(resolveIp(request))) {
    return new NextResponse("Too many demo sessions from your connection. Try again in a few minutes.", {
      status: 429,
    });
  }

  const ownerId = crypto.randomUUID();
  const cookieValue = signOwnerId(ownerId);

  await getRepository().seedDemo(ownerId);

  const response = NextResponse.redirect(new URL("/dashboard", request.url), 302);

  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
