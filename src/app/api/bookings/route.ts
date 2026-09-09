import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, getCurrentUser } from "@/lib/auth";
import { createBooking } from "@/lib/booking";
import { normalizePhone } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const lineSchema = z.object({
  serviceId: z.string().min(1),
  optionIds: z.array(z.string().min(1)).max(10).optional(),
  addonIds: z.array(z.string().min(1)).max(10).optional(),
});

const schema = z.object({
  shopId: z.string().min(1),
  lines: z.array(lineSchema).min(1).max(8),
  staffId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  customerName: z.string().trim().min(2).max(60),
  customerPhone: z.string().trim().min(6),
  notes: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["CASH", "ONLINE"]),
  bookingFor: z.enum(["SELF", "OTHER"]).optional(),
  recipientName: z.string().trim().max(60).optional(),
  recipientPhone: z.string().trim().max(20).optional(),
  recipientNote: z.string().trim().max(200).optional(),
  qrToken: z.string().trim().max(64).optional(),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
  /** Set when an unauthenticated buyer chooses to book without an account. */
  guest: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });

  let user = await getCurrentUser();
  let createdGuest = false;

  if (!user) {
    if (!parsed.data.guest) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

    const limit = rateLimit(`guest:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

    // A guest is a real row with no password, so bookings keep a foreign key
    // and the person can claim the account afterwards.
    const existing = await db.user.findUnique({ where: { phone } });
    if (existing && !existing.isGuest) {
      return NextResponse.json({ error: "ACCOUNT_EXISTS" }, { status: 409 });
    }
    const guest =
      existing ??
      (await db.user.create({
        data: { name: parsed.data.customerName, phone, isGuest: true, role: "CUSTOMER" },
      }));
    await createSession(guest.id, guest.role);
    user = {
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      role: guest.role,
      avatarUrl: guest.avatarUrl,
      locale: guest.locale,
      isBlocked: guest.isBlocked,
    };
    createdGuest = true;
  }

  const limit = rateLimit(`booking:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const result = await createBooking({
    shopId: parsed.data.shopId,
    lines: parsed.data.lines,
    staffId: parsed.data.staffId ?? null,
    date: parsed.data.date,
    startMin: parsed.data.startMin,
    customerId: user.id,
    customerName: parsed.data.customerName,
    customerPhone: phone,
    notes: parsed.data.notes,
    promoCode: parsed.data.promoCode,
    paymentMethod: parsed.data.paymentMethod,
    bookingFor: parsed.data.bookingFor,
    recipientName: parsed.data.recipientName,
    recipientPhone: parsed.data.recipientPhone
      ? normalizePhone(parsed.data.recipientPhone) ?? parsed.data.recipientPhone
      : null,
    recipientNote: parsed.data.recipientNote,
    qrToken: parsed.data.qrToken,
    idempotencyKey: parsed.data.idempotencyKey,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ...result, guest: createdGuest });
}
