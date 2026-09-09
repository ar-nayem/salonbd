import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(6).max(72),
  email: z.string().trim().email().optional(),
});

/** Turns the guest row created at checkout into a real account. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const email = parsed.data.email?.toLowerCase();
  if (email) {
    const clash = await db.user.findFirst({ where: { email, NOT: { id: user.id } } });
    if (clash) return NextResponse.json({ error: "EMAIL_TAKEN" }, { status: 409 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      email: email ?? undefined,
      isGuest: false,
    },
  });

  return NextResponse.json({ ok: true });
}
