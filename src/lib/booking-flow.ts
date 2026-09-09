import "server-only";
import { db } from "./db";
import { canAdvanceTo, isTerminal, nextStatus, SHOP_CANCELLABLE } from "./status";
import { notify } from "./notifications";
import type { BookingStatus } from "@prisma/client";

export type AdvanceResult =
  | { ok: true; status: BookingStatus }
  | { ok: false; error: "NOT_FOUND" | "TERMINAL" | "ILLEGAL_STEP" };

/**
 * The only way a booking moves forward. `to` must be exactly the next status
 * for this booking's fulfilment, so no caller can skip steps.
 */
export async function advanceBooking(opts: {
  bookingId: string;
  shopId: string;
  to?: BookingStatus;
  byUserId?: string | null;
}): Promise<AdvanceResult> {
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, shopId: opts.shopId },
    select: {
      id: true,
      code: true,
      status: true,
      fulfilment: true,
      customerId: true,
      total: true,
      paymentMethod: true,
    },
  });
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  if (isTerminal(booking.status)) return { ok: false, error: "TERMINAL" };

  const step = nextStatus(booking.status, booking.fulfilment);
  if (!step) return { ok: false, error: "TERMINAL" };

  const target = opts.to ?? step.next;
  if (!canAdvanceTo(booking.status, target, booking.fulfilment)) {
    return { ok: false, error: "ILLEGAL_STEP" };
  }

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: {
        status: target,
        // A finished visit means the balance was settled at the chair, whether
        // that was all cash or the remainder after an online deposit.
        ...(target === "COMPLETED"
          ? { paymentStatus: "PAID" as const, amountPaid: booking.total, dueAtShop: 0 }
          : {}),
      },
    }),
    db.bookingEvent.create({
      data: { bookingId: booking.id, status: target, byUserId: opts.byUserId ?? null },
    }),
    ...(target === "COMPLETED"
      ? [db.shop.update({ where: { id: opts.shopId }, data: { bookingCount: { increment: 1 } } })]
      : []),
  ]);

  await notify.send({
    userId: booking.customerId,
    type: "BOOKING_STATUS",
    title: `Booking ${booking.code}`,
    body: `Status is now ${target.toLowerCase().replace("_", " ")}.`,
    href: `/bookings/${booking.id}`,
  });

  return { ok: true, status: target };
}

export type CancelResult = { ok: true } | { ok: false; error: "NOT_FOUND" | "NOT_CANCELLABLE" };

/** Shop-side cancel or no-show. Both are recorded as events. */
export async function shopCloseBooking(opts: {
  bookingId: string;
  shopId: string;
  status: "CANCELLED" | "NO_SHOW";
  byUserId?: string | null;
  reason?: string | null;
}): Promise<CancelResult> {
  const booking = await db.booking.findFirst({
    where: { id: opts.bookingId, shopId: opts.shopId },
    select: { id: true, code: true, status: true, customerId: true },
  });
  if (!booking) return { ok: false, error: "NOT_FOUND" };
  if (!SHOP_CANCELLABLE.includes(booking.status)) return { ok: false, error: "NOT_CANCELLABLE" };

  await db.$transaction([
    db.booking.update({
      where: { id: booking.id },
      data: {
        status: opts.status,
        cancelReason: opts.reason?.slice(0, 200) ?? null,
        cancelledBy: "SHOP",
      },
    }),
    db.bookingEvent.create({
      data: {
        bookingId: booking.id,
        status: opts.status,
        note: opts.reason?.slice(0, 200) ?? null,
        byUserId: opts.byUserId ?? null,
      },
    }),
  ]);

  await notify.send({
    userId: booking.customerId,
    type: "BOOKING_STATUS",
    title: `Booking ${booking.code}`,
    body:
      opts.status === "CANCELLED"
        ? "The shop cancelled this booking."
        : "The shop marked this booking as a no-show.",
    href: `/bookings/${booking.id}`,
  });

  return { ok: true };
}
