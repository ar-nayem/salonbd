import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pushToUser } from "@/lib/push";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  test: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  // An endpoint belongs to one browser; if someone else signs in on it, it moves to them.
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, failures: 0 },
  });

  // Prove it works now, instead of letting the first real reminder be the test.
  const result = await pushToUser(user.id, {
    title: user.locale === "en" ? "Reminders are on" : "রিমাইন্ডার চালু হয়েছে",
    body:
      user.locale === "en"
        ? "We will remind you a day before and an hour before each booking."
        : "প্রতিটি বুকিংয়ের এক দিন আগে ও এক ঘণ্টা আগে মনে করিয়ে দেওয়া হবে।",
    url: "/bookings",
    tag: "push-welcome",
  });

  return NextResponse.json({ ok: true, delivered: result.sent > 0, result });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return NextResponse.json({ ok: true });
}
