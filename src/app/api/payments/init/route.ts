import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initPayment } from "@/lib/payments";

const schema = z.object({ bookingId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { id: parsed.data.bookingId },
    include: { shop: { select: { name: true, depositPercent: true, acceptsOnline: true } } },
  });
  if (!booking || booking.customerId !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!booking.shop.acceptsOnline) {
    return NextResponse.json({ error: "ONLINE_NOT_ACCEPTED" }, { status: 409 });
  }
  if (booking.paymentStatus === "PAID") {
    return NextResponse.json({ error: "ALREADY_PAID" }, { status: 409 });
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "CANCELLED" }, { status: 409 });
  }

  const outstanding = booking.total - booking.amountPaid;
  const amount =
    booking.shop.depositPercent > 0 && booking.amountPaid === 0
      ? Math.max(Math.round((booking.total * booking.shop.depositPercent) / 100), 1)
      : outstanding;

  if (amount <= 0) return NextResponse.json({ error: "NOTHING_DUE" }, { status: 409 });

  try {
    const result = await initPayment({
      bookingId: booking.id,
      amount,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: user.email,
      shopName: booking.shop.name,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "GATEWAY_ERROR", detail: err instanceof Error ? err.message : "unknown" },
      { status: 502 },
    );
  }
}
