import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const limit = rateLimit(`login:${clientIp(req)}`, 20, 15 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { identifier, password } = parsed.data;
  const phone = normalizePhone(identifier);
  const email = identifier.includes("@") ? identifier.toLowerCase() : null;

  const user = await db.user.findFirst({
    where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
  });
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }
  if (user.isBlocked) return NextResponse.json({ error: "BLOCKED" }, { status: 403 });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  await createSession(user.id, user.role);
  return NextResponse.json({ ok: true, role: user.role });
}
