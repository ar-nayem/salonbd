import "server-only";
import { db } from "./db";
import { resolveSlot } from "./availability";
import { evaluatePromo } from "./promo";
import { priceCart, type LineInput } from "./pricing";
import { ensureBookingQr, resolveQr } from "./qr";
import { notify } from "./notifications";
import { bookingCode, todayISO } from "./utils";
import { FEATURE_HOME_SERVICE } from "./constants";

class SlotTakenError extends Error {}

export type CreateBookingInput = {
  shopId: string;
  lines: LineInput[];
  staffId?: string | null;
  date: string;
  startMin: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  promoCode?: string;
  paymentMethod: "CASH" | "ONLINE";
  fulfilment?: "IN_SHOP" | "HOME_SERVICE";
  bookingFor?: "SELF" | "OTHER";
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientNote?: string | null;
  /** Scanned chair token. The station is resolved from it server-side. */
  qrToken?: string | null;
  idempotencyKey?: string | null;
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; code: string; payNow: number; reused: boolean }
  | { ok: false; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  // A retry of the same submission returns the booking that already exists
  // rather than creating a second one.
  if (input.idempotencyKey) {
    const existing = await db.booking.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, code: true, total: true, amountPaid: true, paymentMethod: true },
    });
    if (existing) {
      return {
        ok: true,
        bookingId: existing.id,
        code: existing.code,
        payNow: existing.paymentMethod === "ONLINE" ? existing.total - existing.amountPaid : 0,
        reused: true,
      };
    }
  }

  if (input.lines.length === 0) return { ok: false, error: "NO_SERVICES" };
  if (input.date < todayISO()) return { ok: false, error: "PAST_DATE" };

  const fulfilment = input.fulfilment ?? "IN_SHOP";
  if (fulfilment === "HOME_SERVICE" && !FEATURE_HOME_SERVICE) {
    return { ok: false, error: "HOME_SERVICE_DISABLED" };
  }

  const shop = await db.shop.findUnique({
    where: { id: input.shopId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      status: true,
      isActive: true,
      acceptsCash: true,
      acceptsOnline: true,
      depositPercent: true,
    },
  });
  if (!shop || shop.status !== "ACTIVE" || !shop.isActive) {
    return { ok: false, error: "SHOP_UNAVAILABLE" };
  }

  if (input.paymentMethod === "CASH" && !shop.acceptsCash) return { ok: false, error: "CASH_NOT_ACCEPTED" };
  if (input.paymentMethod === "ONLINE" && !shop.acceptsOnline) {
    return { ok: false, error: "ONLINE_NOT_ACCEPTED" };
  }

  const priced = await priceCart(shop.id, input.lines);
  if (!priced.ok) return { ok: false, error: priced.error };

  // The chair comes from the scanned token, re-resolved here — the client
  // never sends a station id.
  let stationId: string | null = null;
  if (input.qrToken) {
    const qr = await resolveQr(input.qrToken);
    if (qr?.isActive && qr.type === "STATION" && qr.station?.shopId === shop.id) {
      stationId = qr.station.id;
    }
  }

  const slot = await resolveSlot({
    shopId: shop.id,
    date: input.date,
    serviceIds: priced.serviceIds,
    durationMin: priced.durationMin,
    startMin: input.startMin,
    staffId: input.staffId ?? null,
  });
  if (!slot.ok) return { ok: false, error: slot.reason };

  let discount = 0;
  let promoId: string | null = null;
  if (input.promoCode) {
    const promo = await evaluatePromo({
      code: input.promoCode,
      shopId: shop.id,
      userId: input.customerId,
      subtotal: priced.subtotal,
    });
    if (promo.ok) {
      discount = promo.discount;
      promoId = promo.promoId;
    }
  }

  const total = Math.max(priced.subtotal - discount, 0);
  const payNow =
    input.paymentMethod === "ONLINE"
      ? shop.depositPercent > 0
        ? Math.max(Math.round((total * shop.depositPercent) / 100), 1)
        : total
      : 0;

  const code = bookingCode();
  const bookingFor = input.bookingFor === "OTHER" ? "OTHER" : "SELF";

  const booking = await db
    .$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          code,
          idempotencyKey: input.idempotencyKey ?? null,
          customerId: input.customerId,
          shopId: shop.id,
          staffId: slot.staffId,
          stationId,
          date: input.date,
          startMin: input.startMin,
          endMin: input.startMin + priced.durationMin,
          status: "PENDING",
          fulfilment,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          bookingFor,
          // Snapshot: editing a saved contact later never rewrites this booking.
          recipientName: bookingFor === "OTHER" ? input.recipientName || null : null,
          recipientPhone: bookingFor === "OTHER" ? input.recipientPhone || null : null,
          recipientNote: bookingFor === "OTHER" ? input.recipientNote || null : null,
          notes: input.notes || null,
          subtotal: priced.subtotal,
          discount,
          total,
          promoId,
          paymentMethod: input.paymentMethod,
          paymentStatus: "UNPAID",
          dueAtShop: total,
          items: {
            create: priced.lines.map((line) => ({
              serviceId: line.serviceId,
              name: line.name,
              price: line.price,
              durationMin: line.durationMin,
              options: {
                create: line.parts.map((p) => ({
                  kind: p.kind,
                  name: p.name,
                  price: p.price,
                  durationMin: p.durationMin,
                })),
              },
            })),
          },
          events: { create: { status: "PENDING" } },
        },
      });

      if (promoId && discount > 0) {
        await tx.promo.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
        await tx.promoRedemption.create({
          data: { promoId, userId: input.customerId, bookingId: created.id, amount: discount },
        });
      }

      // Two customers can clear the availability check at the same moment;
      // this second look runs after the write and rolls back the loser.
      const clashes = await tx.booking.count({
        where: {
          id: { not: created.id },
          shopId: shop.id,
          date: input.date,
          staffId: slot.staffId,
          status: { in: ["PENDING", "CONFIRMED", "ACCEPTED", "READY", "IN_PROGRESS"] },
          startMin: { lt: created.endMin },
          endMin: { gt: created.startMin },
        },
      });
      if (clashes > 0) throw new SlotTakenError();

      return created;
    })
    .catch((err) => {
      if (err instanceof SlotTakenError) return null;
      throw err;
    });

  if (!booking) return { ok: false, error: "SLOT_TAKEN" };

  await ensureBookingQr(booking.id, shop.id);
  await notify.send({
    userId: shop.ownerId,
    type: "BOOKING_NEW",
    title: "New booking",
    body: `${input.customerName} booked ${input.date} — code ${code}.`,
    href: "/dashboard/bookings",
  });

  return { ok: true, bookingId: booking.id, code, payNow, reused: false };
}

export async function recomputeShopRating(shopId: string) {
  const agg = await db.review.aggregate({
    where: { shopId, isHidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await db.shop.update({
    where: { id: shopId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });
}

export async function recomputeStaffRating(staffId: string) {
  const agg = await db.review.aggregate({
    where: { staffId, isHidden: false, staffRating: { not: null } },
    _avg: { staffRating: true },
    _count: true,
  });
  await db.staff.update({
    where: { id: staffId },
    data: {
      ratingAvg: Math.round((agg._avg.staffRating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });
}
