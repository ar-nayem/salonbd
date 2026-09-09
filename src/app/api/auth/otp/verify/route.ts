import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { verifyCode } from "@/lib/otp";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  destination: z.string().trim().min(3).max(120),
  code: z.string().trim().regex(/^\d{6}$/),
  name: z.string().trim().min(2).max(60).optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const raw = parsed.data.destination;
  const isEmail = raw.includes("@");
  const destination = isEmail ? raw.toLowerCase() : normalizePhone(raw);
  if (!destination) return NextResponse.json({ error: "INVALID_DESTINATION" }, { status: 400 });

  const check = await verifyCode(destination, parsed.data.code);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 401 });

  const where = isEmail ? { email: destination } : { phone: destination };
  let user = await db.user.findFirst({ where });

  if (!user) {
    user = await db.user.create({
      data: {
        name: parsed.data.name || (isEmail ? destination.split("@")[0] : "SalonBD user"),
        ...(isEmail ? { email: destination } : { phone: destination }),
        // Never read the role from the request.
        role: "CUSTOMER",
      },
    });
  } else if (user.isBlocked) {
    return NextResponse.json({ error: "BLOCKED" }, { status: 403 });
  } else if (user.isGuest) {
    // A verified code proves the number, so the guest row becomes a real account.
    user = await db.user.update({ where: { id: user.id }, data: { isGuest: false } });
  }

  await createSession(user.id, user.role);
  return NextResponse.json({ ok: true, role: user.role });
}
