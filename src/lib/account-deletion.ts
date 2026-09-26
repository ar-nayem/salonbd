import "server-only";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "./db";
import { UPLOAD_DIR } from "./uploads";
import { recomputeShopRating, recomputeStaffRating } from "./booking";

/**
 * What deletion does, in the same words the privacy policy uses:
 *
 * Removed outright — name, email, phone, password, Google link, photo, date of
 * birth, saved shops, notifications, reminder subscriptions, calendar link,
 * reviews (with their photos), and messages the person wrote.
 *
 * Kept, with the person detached — the booking rows themselves, because a shop
 * needs its own record of who was served and what was paid. Every personal
 * field on them is overwritten, so what remains is "someone booked a haircut
 * on this date for this amount".
 */
export type DeleteResult =
  | { ok: true; summary: Record<string, number> }
  | { ok: false; reason: "OWNS_SHOP" | "IS_STAFF" | "NOT_FOUND" };

export async function deleteAccount(userId: string): Promise<DeleteResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      _count: { select: { shops: true, memberships: true } },
    },
  });
  if (!user) return { ok: false, reason: "NOT_FOUND" };

  // A shop owner's account is tied to live listings, staff and takings. Self
  // service deletion would orphan all of it, so it is refused with a reason
  // rather than half-done.
  if (user._count.shops > 0) return { ok: false, reason: "OWNS_SHOP" };
  if (user._count.memberships > 0) return { ok: false, reason: "IS_STAFF" };

  // Files first: once the rows are gone we can no longer tell which blobs were theirs.
  const files = await db.uploadedFile.findMany({
    where: { uploaderId: userId },
    select: { id: true, filename: true },
  });
  for (const file of files) {
    await unlink(path.join(UPLOAD_DIR, file.filename)).catch(() => {
      // A missing file is fine; the row still goes.
    });
  }

  const shopIds = await db.review.findMany({
    where: { customerId: userId },
    select: { shopId: true, staffId: true },
  });

  const summary = await db.$transaction(async (tx) => {
    const counts: Record<string, number> = {};

    counts.reviews = (await tx.review.deleteMany({ where: { customerId: userId } })).count;
    counts.reviewVotes = (await tx.reviewVote.deleteMany({ where: { userId } })).count;
    counts.messages = (await tx.message.deleteMany({ where: { senderId: userId } })).count;
    counts.favourites = (await tx.favorite.deleteMany({ where: { userId } })).count;
    counts.notifications = (await tx.notification.deleteMany({ where: { userId } })).count;
    counts.pushSubscriptions = (await tx.pushSubscription.deleteMany({ where: { userId } })).count;
    counts.uploads = (await tx.uploadedFile.deleteMany({ where: { uploaderId: userId } })).count;
    // Scan rows stay as counts for the shop, with the person unlinked.
    counts.qrScans = (await tx.qrScan.updateMany({ where: { userId }, data: { userId: null } })).count;

    // Conversations left with no messages carry nothing but a link to a booking.
    const empty = await tx.conversation.findMany({
      where: { booking: { customerId: userId }, messages: { none: {} } },
      select: { id: true },
    });
    counts.conversations = (
      await tx.conversation.deleteMany({ where: { id: { in: empty.map((c) => c.id) } } })
    ).count;

    counts.bookingsAnonymised = (
      await tx.booking.updateMany({
        where: { customerId: userId },
        data: {
          customerName: "Deleted user",
          customerPhone: "",
          notes: null,
          recipientName: null,
          recipientPhone: null,
          recipientNote: null,
        },
      })
    ).count;

    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Deleted user",
        email: null,
        phone: null,
        passwordHash: null,
        googleId: null,
        avatarUrl: null,
        dateOfBirth: null,
        calendarToken: null,
        isGuest: false,
        // Nothing can sign in to this row again.
        isBlocked: true,
      },
    });

    return counts;
  });

  // Ratings were computed from reviews that no longer exist.
  for (const shopId of new Set(shopIds.map((r) => r.shopId))) {
    await recomputeShopRating(shopId);
  }
  for (const staffId of new Set(shopIds.map((r) => r.staffId).filter(Boolean) as string[])) {
    await recomputeStaffRating(staffId);
  }

  return { ok: true, summary };
}
