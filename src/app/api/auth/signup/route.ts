import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z
  .object({
    name: z.string().trim().min(2).max(60),
    phone: z.string().trim().optional().or(z.literal("")),
    email: z.string().trim().email().optional().or(z.literal("")),
    password: z.string().min(6).max(72),
    role: z.enum(["CUSTOMER", "OWNER"]).default("CUSTOMER"),
  })
  .refine((v) => v.phone || v.email, { message: "PHONE_OR_EMAIL_REQUIRED" });

export async function POST(req: Request) {
  const limit = rateLimit(`signup:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { name, password, role } = parsed.data;
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const clash = await db.user.findFirst({
    where: { OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])] },
    select: { id: true, phone: true, email: true },
  });
  if (clash) {
    return NextResponse.json(
      { error: clash.phone === phone ? "PHONE_TAKEN" : "EMAIL_TAKEN" },
      { status: 409 },
    );
  }

  const user = await db.user.create({
    data: { name, phone, email, passwordHash: await hashPassword(password), role },
    select: { id: true, role: true },
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ ok: true, role: user.role });
}
