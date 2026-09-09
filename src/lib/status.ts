import type { BookingStatus, Fulfilment } from "@prisma/client";

/**
 * The single source of truth for how a booking advances.
 *
 * Every surface that moves a booking forward — the shop's board, a staff QR
 * scan, an admin action — reads from here. Nothing hardcodes a target status,
 * so a scan can never jump a booking from "just accepted" to "collected".
 */
export const FLOW: Record<Fulfilment, BookingStatus[]> = {
  IN_SHOP: ["PENDING", "CONFIRMED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"],
  HOME_SERVICE: ["PENDING", "CONFIRMED", "READY", "IN_PROGRESS", "COMPLETED"],
};

export const TERMINAL: BookingStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

/** Statuses a customer is still allowed to cancel from. */
export const CUSTOMER_CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED"];

/** Statuses the shop may still cancel or mark as a no-show. */
export const SHOP_CANCELLABLE: BookingStatus[] = ["PENDING", "CONFIRMED", "ACCEPTED", "READY"];

/** The step after `status`, or null at the end of the flow. */
export function nextStatus(
  status: BookingStatus,
  fulfilment: Fulfilment,
): { next: BookingStatus; labelKey: string } | null {
  const flow = FLOW[fulfilment];
  const index = flow.indexOf(status);
  if (index === -1 || index === flow.length - 1) return null;
  const next = flow[index + 1];
  return { next, labelKey: `advance.${next}` };
}

/** True when `status` has been reached in this fulfilment's flow. */
export function isReached(
  status: BookingStatus,
  step: BookingStatus,
  fulfilment: Fulfilment,
): boolean {
  const flow = FLOW[fulfilment];
  return flow.indexOf(status) >= flow.indexOf(step) && flow.indexOf(step) !== -1;
}

export function isTerminal(status: BookingStatus) {
  return TERMINAL.includes(status);
}

/** Guard for any endpoint that advances a booking: exactly one step, never a jump. */
export function canAdvanceTo(
  from: BookingStatus,
  to: BookingStatus,
  fulfilment: Fulfilment,
): boolean {
  const step = nextStatus(from, fulfilment);
  return step !== null && step.next === to;
}
