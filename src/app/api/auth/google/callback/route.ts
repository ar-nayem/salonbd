import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const raw = jar.get("sb_oauth")?.value;
  jar.delete("sb_oauth");

  if (!code || !raw) return NextResponse.redirect(new URL("/login?error=oauth", req.url));

  let saved: { state: string; next: string; role: "CUSTOMER" | "OWNER" };
  try {
    saved = JSON.parse(raw);
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", req.url));
  }
  if (saved.state !== state) return NextResponse.redirect(new URL("/login?error=state", req.url));

  let profile;
  try {
    profile = await exchangeGoogleCode(code);
  } catch {
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }

  const email = profile.email?.toLowerCase() ?? null;

  let user = await db.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, ...(email ? [{ email }] : [])] },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: profile.name || email?.split("@")[0] || "Google user",
        email,
        googleId: profile.sub,
        avatarUrl: profile.picture ?? null,
        role: saved.role,
      },
    });
  } else if (!user.googleId) {
    user = await db.user.update({
      where: { id: user.id },
      data: { googleId: profile.sub, avatarUrl: user.avatarUrl ?? profile.picture ?? null },
    });
  }

  if (user.isBlocked) return NextResponse.redirect(new URL("/login?error=blocked", req.url));

  await createSession(user.id, user.role);
  const dest = user.role === "OWNER" ? "/dashboard" : saved.next || "/";
  return NextResponse.redirect(new URL(dest, req.url));
}
