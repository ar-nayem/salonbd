import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { callerShopIds, isAdmin } from "@/lib/tenancy";

/** Polled by the buyer's tracking page. No realtime transport is wired up. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      customerId: true,
      shopId: true,
      updatedAt: true,
      events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const allowed =
    booking.customerId === user.id ||
    isAdmin(user.role) ||
    (await callerShopIds(user)).includes(booking.shopId);
  if (!allowed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    updatedAt: booking.updatedAt,
    events: booking.events,
  });
}
