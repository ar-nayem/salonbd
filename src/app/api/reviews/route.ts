import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recomputeShopRating, recomputeStaffRating } from "@/lib/booking";
import { isUsableImageRef } from "@/lib/uploads";
import { REVIEW_TAGS } from "@/lib/constants";

const schema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  staffRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(600).optional(),
  tags: z.array(z.string()).max(7).optional(),
  photos: z.array(z.string().max(500)).max(6).optional(),
  items: z
    .array(
      z.object({
        bookingItemId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
      }),
    )
    .max(8)
    .optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const booking = await db.booking.findUnique({
    where: { id: parsed.data.bookingId },
    select: {
      id: true,
      customerId: true,
      shopId: true,
      staffId: true,
      status: true,
      items: { select: { id: true, serviceId: true } },
    },
  });
  // Only the buyer of a finished visit can review it.
  if (!booking || booking.customerId !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (booking.status !== "COMPLETED") {
    return NextResponse.json({ error: "NOT_COMPLETED" }, { status: 409 });
  }
  if (await db.review.findUnique({ where: { bookingId: booking.id } })) {
    return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
  }

  const tags = (parsed.data.tags ?? []).filter((tag) =>
    (REVIEW_TAGS as readonly string[]).includes(tag),
  );
  const photos = (parsed.data.photos ?? []).filter(isUsableImageRef);
  const itemRatings = (parsed.data.items ?? []).flatMap((entry) => {
    const item = booking.items.find((i) => i.id === entry.bookingItemId);
    return item
      ? [{ bookingItemId: item.id, serviceId: item.serviceId, rating: entry.rating }]
      : [];
  });

  await db.review.create({
    data: {
      bookingId: booking.id,
      customerId: user.id,
      shopId: booking.shopId,
      staffId: booking.staffId,
      rating: parsed.data.rating,
      staffRating: parsed.data.staffRating ?? null,
      comment: parsed.data.comment || null,
      tags: { create: tags.map((tag) => ({ tag })) },
      photos: { create: photos.map((url) => ({ url })) },
      itemRatings: { create: itemRatings },
    },
  });

  await recomputeShopRating(booking.shopId);
  if (booking.staffId) await recomputeStaffRating(booking.staffId);

  return NextResponse.json({ ok: true });
}
