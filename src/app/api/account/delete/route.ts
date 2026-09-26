import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, getCurrentUser, verifyPassword } from "@/lib/auth";
import { deleteAccount } from "@/lib/account-deletion";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  confirm: z.string(),
  password: z.string().max(72).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const limit = rateLimit(`delete:${user.id}:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Typed confirmation, so a stray tap cannot erase an account.
  if (parsed.data.confirm.trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: "CONFIRM_REQUIRED" }, { status: 400 });
  }

  // Accounts with a password must prove it; a borrowed unlocked phone should
  // not be enough. Code-only and Google accounts have nothing to check.
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (record?.passwordHash) {
    if (!parsed.data.password) return NextResponse.json({ error: "PASSWORD_REQUIRED" }, { status: 400 });
    const valid = await verifyPassword(parsed.data.password, record.passwordHash);
    if (!valid) return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 401 });
  }

  const result = await deleteAccount(user.id);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });

  await destroySession();
  return NextResponse.json({ ok: true, summary: result.summary });
}
