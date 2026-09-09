import "server-only";
import { db } from "./db";
import { resolveSlot } from "./availability";
import { evaluatePromo } from "./promo";
import { bookingCode, todayISO } from "./utils";

class SlotTakenError extends Error {}

export type CreateBookingInput = {
  shopId: string;
  serviceIds: string[];
  staffId?: string | null;
  date: string;
  startMin: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  promoCode?: string;
  paymentMethod: "CASH" | "ONLINE";
};

export type CreateBookingResult =
  | { ok: true; bookingId: string; code: string; payNow: number }
  | { ok: false; error: string };

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  if (input.serviceIds.length === 0) return { ok: false, error: "NO_SERVICES" };
  if (input.date < todayISO()) return { ok: false, error: "PAST_DATE" };

  const shop = await db.shop.findUnique({
    where: { id: input.shopId },
    select: {
      id: true,
      name: true,
      isActive: true,
      acceptsCash: true,
      acceptsOnline: true,
      depositPercent: true,
    },
  });
  if (!shop || !shop.isActive) return { ok: false, error: "SHOP_UNAVAILABLE" };

  const services = await db.service.findMany({
    where: { id: { in: input.serviceIds }, shopId: shop.id, isActive: true },
  });
  if (services.length !== input.serviceIds.length) return { ok: false, error: "SERVICE_UNAVAILABLE" };

  if (input.paymentMethod === "CASH" && !shop.acceptsCash) return { ok: false, error: "CASH_NOT_ACCEPTED" };
  if (input.paymentMethod === "ONLINE" && !shop.acceptsOnline) {
    return { ok: false, error: "ONLINE_NOT_ACCEPTED" };
  }

  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);
  const subtotal = services.reduce((sum, s) => sum + s.price, 0);

  const slot = await resolveSlot({
    shopId: shop.id,
    date: input.date,
    serviceIds: input.serviceIds,
    durationMin,
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
      subtotal,
    });
    if (promo.ok) {
      discount = promo.discount;
      promoId = promo.promoId;
    }
  }

  const total = Math.max(subtotal - discount, 0);
  const payNow =
    input.paymentMethod === "ONLINE"
      ? shop.depositPercent > 0
        ? Math.max(Math.round((total * shop.depositPercent) / 100), 1)
        : total
      : 0;

  const code = bookingCode();

  const booking = await db
    .$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          code,
          customerId: input.customerId,
          shopId: shop.id,
          staffId: slot.staffId,
          date: input.date,
          startMin: input.startMin,
          endMin: input.startMin + durationMin,
          status: "PENDING",
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          notes: input.notes || null,
          subtotal,
          discount,
          total,
          promoId,
          paymentMethod: input.paymentMethod,
          paymentStatus: "UNPAID",
          dueAtShop: total,
          items: {
            create: services.map((s) => ({
              serviceId: s.id,
              name: s.name,
              price: s.price,
              durationMin: s.durationMin,
            })),
          },
        },
      });

      if (promoId && discount > 0) {
        await tx.promo.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
        await tx.promoRedemption.create({
          data: { promoId, userId: input.customerId, bookingId: created.id, amount: discount },
        });
      }

      const owner = await tx.shop.findUnique({ where: { id: shop.id }, select: { ownerId: true } });
      if (owner) {
        await tx.notification.create({
          data: {
            userId: owner.ownerId,
            title: "New booking",
            body: `${input.customerName} booked ${input.date} — code ${code}.`,
            href: `/dashboard/bookings`,
          },
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
          status: { in: ["PENDING", "CONFIRMED"] },
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

  return { ok: true, bookingId: booking.id, code, payNow };
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
    where: { staffId, isHidden: false },
    _avg: { rating: true },
    _count: true,
  });
  await db.staff.update({
    where: { id: staffId },
    data: {
      ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  });
}
