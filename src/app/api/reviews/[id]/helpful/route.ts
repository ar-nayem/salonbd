import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** One vote per person. The count is always derived from these rows. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const review = await db.review.findUnique({ where: { id }, select: { id: true } });
  if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const existing = await db.reviewVote.findUnique({
    where: { reviewId_userId: { reviewId: id, userId: user.id } },
  });

  if (existing) {
    await db.reviewVote.delete({ where: { id: existing.id } });
  } else {
    await db.reviewVote.create({ data: { reviewId: id, userId: user.id } });
  }

  const count = await db.reviewVote.count({ where: { reviewId: id } });
  return NextResponse.json({ voted: !existing, count });
}
