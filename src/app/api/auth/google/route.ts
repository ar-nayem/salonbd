import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/";
  const role = url.searchParams.get("role") === "OWNER" ? "OWNER" : "CUSTOMER";

  const state = randomUUID();
  const jar = await cookies();
  jar.set("sb_oauth", JSON.stringify({ state, next, role }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(googleAuthUrl(state));
}
