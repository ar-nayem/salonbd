import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { callerShopIds, isAdmin } from "@/lib/tenancy";
import { shopCloseBooking } from "@/lib/booking-flow";
import { CUSTOMER_CANCELLABLE } from "@/lib/status";
import { notify } from "@/lib/notifications";
import { nowMinutes, todayISO } from "@/lib/utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const booking = await db.booking.findUnique({
    where: { id },
    select: { id: true, code: true, status: true, customerId: true, shopId: true, date: true, startMin: true },
  });
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isCustomer = booking.customerId === user.id;
  const isShop = isAdmin(user.role) || (await callerShopIds(user)).includes(booking.shopId);
  // Neither the buyer nor the shop: same answer as a missing booking.
  if (!isCustomer && !isShop) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  if (isShop && !isCustomer) {
    const result = await shopCloseBooking({
      bookingId: id,
      shopId: booking.shopId,
      status: "CANCELLED",
      byUserId: user.id,
      reason: body.reason ?? null,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  if (!CUSTOMER_CANCELLABLE.includes(booking.status)) {
    return NextResponse.json({ error: "NOT_CANCELLABLE" }, { status: 409 });
  }
  const started =
    booking.date < todayISO() || (booking.date === todayISO() && booking.startMin <= nowMinutes());
  if (started) return NextResponse.json({ error: "TOO_LATE" }, { status: 409 });

  const shop = await db.shop.findUnique({
    where: { id: booking.shopId },
    select: { ownerId: true },
  });

  await db.$transaction([
    db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason: body.reason?.slice(0, 200) ?? null,
        cancelledBy: "CUSTOMER",
      },
    }),
    db.bookingEvent.create({
      data: { bookingId: id, status: "CANCELLED", byUserId: user.id, note: "cancelled by customer" },
    }),
  ]);

  if (shop) {
    await notify.send({
      userId: shop.ownerId,
      type: "BOOKING_CANCELLED",
      title: "Booking cancelled",
      body: `Booking ${booking.code} was cancelled by the customer.`,
      href: "/dashboard/bookings",
    });
  }

  return NextResponse.json({ ok: true });
}
