import { type NextRequest, NextResponse } from "next/server";
import { signOwnerId } from "@/lib/demoSession";
import { getRepository } from "@/lib/repositoryFactory";

const COOKIE_NAME = "ab_demo";
const MAX_AGE_SECONDS = 86400;

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const ownerId = crypto.randomUUID();
  const cookieValue = signOwnerId(ownerId);

  const repo = getRepository();
  await repo.seedDemo(ownerId);

  const isProduction = process.env["NODE_ENV"] === "production";

  const response = NextResponse.redirect(new URL("/dashboard", _request.url), 302);

  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}
