import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { nowMinutes, todayISO } from "@/lib/utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const booking = await db.booking.findUnique({
    where: { id },
    include: { shop: { select: { ownerId: true, id: true } } },
  });
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const isCustomer = booking.customerId === user.id;
  const isShop = booking.shop.ownerId === user.id || user.role === "ADMIN";
  if (!isCustomer && !isShop) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return NextResponse.json({ error: "NOT_CANCELLABLE" }, { status: 409 });
  }

  // Customers cannot cancel once the slot has started.
  if (isCustomer && !isShop) {
    const started =
      booking.date < todayISO() || (booking.date === todayISO() && booking.startMin <= nowMinutes());
    if (started) return NextResponse.json({ error: "TOO_LATE" }, { status: 409 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  await db.$transaction([
    db.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelReason: body.reason?.slice(0, 200) ?? null,
        cancelledBy: isCustomer ? "CUSTOMER" : "SHOP",
      },
    }),
    db.notification.create({
      data: {
        userId: isCustomer ? booking.shop.ownerId : booking.customerId,
        title: "Booking cancelled",
        body: `Booking ${booking.code} was cancelled.`,
        href: isCustomer ? "/dashboard/bookings" : `/bookings/${booking.id}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
