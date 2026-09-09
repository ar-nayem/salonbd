import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recomputeShopRating, recomputeStaffRating } from "@/lib/booking";
import { REVIEW_TAGS } from "@/lib/constants";

const schema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  staffRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(600).optional(),
  tags: z.array(z.string()).max(7).optional(),
});

/** A buyer can edit their own review. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const review = await db.review.findUnique({ where: { id } });
  if (!review || review.customerId !== user.id) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  await db.review.update({
    where: { id },
    data: {
      rating: parsed.data.rating ?? review.rating,
      staffRating: parsed.data.staffRating ?? review.staffRating,
      comment: parsed.data.comment ?? review.comment,
    },
  });

  if (parsed.data.tags) {
    const tags = parsed.data.tags.filter((tag) => (REVIEW_TAGS as readonly string[]).includes(tag));
    await db.reviewTag.deleteMany({ where: { reviewId: id } });
    if (tags.length > 0) {
      await db.reviewTag.createMany({ data: tags.map((tag) => ({ reviewId: id, tag })) });
    }
  }

  await recomputeShopRating(review.shopId);
  if (review.staffId) await recomputeStaffRating(review.staffId);

  return NextResponse.json({ ok: true });
}
