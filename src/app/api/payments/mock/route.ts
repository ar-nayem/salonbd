import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { activeProvider, failPayment, settlePayment } from "@/lib/payments";

const schema = z.object({ reference: z.string().min(1), outcome: z.enum(["success", "fail"]) });

/** Sandbox-only endpoint used by the built-in MOCK gateway page. */
export async function POST(req: Request) {
  if (activeProvider() !== "MOCK") {
    return NextResponse.json({ error: "MOCK_DISABLED" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const payment = await db.payment.findUnique({
    where: { reference: parsed.data.reference },
    include: { booking: { select: { customerId: true, id: true } } },
  });
  if (!payment || payment.booking.customerId !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (parsed.data.outcome === "fail") {
    await failPayment(payment.reference!, { mock: true });
    return NextResponse.json({ ok: false, bookingId: payment.bookingId });
  }

  const result = await settlePayment({
    reference: payment.reference!,
    trxId: `MOCK-${Date.now()}`,
    amount: payment.amount,
    raw: { mock: true },
  });
  return NextResponse.json({ ok: result.ok, bookingId: payment.bookingId });
}
