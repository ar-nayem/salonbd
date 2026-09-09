import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { advanceBooking } from "@/lib/booking-flow";
import { requireShopApi, TenantError } from "@/lib/tenancy";

const schema = z.object({
  to: z
    .enum(["CONFIRMED", "ACCEPTED", "READY", "IN_PROGRESS", "COMPLETED"])
    .optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const booking = await db.booking.findUnique({ where: { id }, select: { shopId: true } });
  // Same 404 whether the booking is missing or belongs to another shop.
  if (!booking) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    const access = await requireShopApi(booking.shopId);
    const body = schema.safeParse(await req.json().catch(() => ({})));
    const result = await advanceBooking({
      bookingId: id,
      shopId: booking.shopId,
      to: body.success ? body.data.to : undefined,
      byUserId: access.user.id,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "NOT_FOUND" ? 404 : 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "UNAUTHENTICATED" ? 401 : 404 },
      );
    }
    throw err;
  }
}
