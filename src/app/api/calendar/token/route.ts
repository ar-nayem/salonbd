import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureCalendarToken, feedUrls } from "@/lib/calendar";
import { getLocale } from "@/lib/i18n";

/** Returns the caller's feed links, creating the token on first use. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const token = await ensureCalendarToken(user.id);
  return NextResponse.json(feedUrls(token, await getLocale()));
}

/** Rotates the token. Anyone who had the old link stops receiving updates. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const token = await ensureCalendarToken(user.id, true);
  return NextResponse.json(feedUrls(token, await getLocale()));
}
