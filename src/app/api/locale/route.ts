import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n";

export async function POST(req: Request) {
  const { locale } = (await req.json()) as { locale?: string };
  if (locale !== "bn" && locale !== "en") {
    return NextResponse.json({ error: "BAD_LOCALE" }, { status: 400 });
  }
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
