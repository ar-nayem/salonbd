import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recomputeShopRating, recomputeStaffRating } from "@/lib/booking";

const schema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: { id: true, customerId: true, shopId: true, staffId: true, status: true },
  });
  if (!booking || booking.customerId !== user.id) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 409 });
  }

  const existing = await db.review.findUnique({ where: { bookingId: booking.id } });
  if (existing) return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });

  await db.review.create({
    data: {
      bookingId: booking.id,
      customerId: user.id,
      shopId: booking.shopId,
      staffId: booking.staffId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
    },
  });

  await recomputeShopRating(booking.shopId);
  if (booking.staffId) await recomputeStaffRating(booking.staffId);

  return NextResponse.json({ ok: true });
}
