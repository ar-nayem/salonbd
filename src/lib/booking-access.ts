import "server-only";
import { db } from "./db";
import { callerShopIds, isAdmin } from "./tenancy";
import type { CurrentUser } from "./auth";

export type BookingAccess =
  | { ok: true; side: "CUSTOMER" | "SHOP"; shopId: string; customerId: string }
  | { ok: false };

/**
 * The single rule for "who may see this booking". Messaging, tracking and
 * cancellation all call this, so a second check cannot drift from the first.
 */
export async function bookingAccess(
  user: CurrentUser | null,
  bookingId: string,
): Promise<BookingAccess> {
  if (!user) return { ok: false };

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, shopId: true, customerId: true },
  });
  if (!booking) return { ok: false };

  if (booking.customerId === user.id) {
    return { ok: true, side: "CUSTOMER", shopId: booking.shopId, customerId: booking.customerId };
  }
  if (isAdmin(user.role) || (await callerShopIds(user)).includes(booking.shopId)) {
    return { ok: true, side: "SHOP", shopId: booking.shopId, customerId: booking.customerId };
  }
  return { ok: false };
}
