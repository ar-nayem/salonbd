import "server-only";
import { db } from "./db";
import { addDaysISO, todayISO } from "./utils";
import type { Prisma } from "@prisma/client";

/**
 * Only bookings the shop was actually paid for. A dashboard must never read
 * higher than the bank.
 */
export const PAID_WHERE = {
  status: "COMPLETED",
  paymentStatus: "PAID",
} satisfies Prisma.BookingWhereInput;

/**
 * Booking dates are stored as local (Asia/Dhaka) yyyy-mm-dd strings, so bucket
 * keys are built from those parts directly. Converting through an ISO/UTC
 * timestamp would shift local midnight into the previous day.
 */
export function dayKeys(days: number): string[] {
  const end = todayISO();
  return Array.from({ length: days }, (_, i) => addDaysISO(end, -(days - 1 - i)));
}

export function monthKeys(months: number): string[] {
  const [y, m] = todayISO().split("-").map(Number);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export type Series = { key: string; revenue: number; bookings: number }[];

/** Empty days are returned as zeroes, so a quiet day is a flat run, not a gap. */
export async function revenueSeries(days: number, shopId?: string): Promise<Series> {
  const keys = dayKeys(days);
  const bookings = await db.booking.findMany({
    where: { ...PAID_WHERE, ...(shopId ? { shopId } : {}), date: { gte: keys[0] } },
    select: { date: true, total: true },
  });

  const totals = new Map(keys.map((key) => [key, { revenue: 0, bookings: 0 }]));
  for (const b of bookings) {
    const bucket = totals.get(b.date);
    if (!bucket) continue;
    bucket.revenue += b.total;
    bucket.bookings += 1;
  }
  return keys.map((key) => ({ key, ...totals.get(key)! }));
}

export type ShopSettlement = {
  shopId: string;
  name: string;
  gross: number;
  commission: number;
  net: number;
  bookings: number;
  avgOrder: number;
};

/**
 * Money is rounded at the unit that is actually settled — one shop, one period
 * — and only then summed. Rounding the combined total instead leaves the
 * summary disagreeing with the sum of its own rows.
 */
export async function settlements(fromDate: string, toDate: string): Promise<ShopSettlement[]> {
  const shops = await db.shop.findMany({ select: { id: true, name: true, commissionRate: true } });
  const grouped = await db.booking.groupBy({
    by: ["shopId"],
    where: { ...PAID_WHERE, date: { gte: fromDate, lte: toDate } },
    _sum: { total: true },
    _count: true,
  });

  return shops
    .map((shop) => {
      const row = grouped.find((g) => g.shopId === shop.id);
      const gross = row?._sum.total ?? 0;
      const bookings = row?._count ?? 0;
      const commission = Math.round(gross * shop.commissionRate);
      return {
        shopId: shop.id,
        name: shop.name,
        gross,
        commission,
        net: gross - commission,
        bookings,
        avgOrder: bookings > 0 ? Math.round(gross / bookings) : 0,
      };
    })
    .filter((row) => row.bookings > 0)
    .sort((a, b) => b.gross - a.gross);
}

export function ageBracket(dob: Date): string {
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;

  if (age < 18) return "under 18";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 60) return "45-59";
  return "60+";
}

export const AGE_BRACKETS = ["under 18", "18-24", "25-34", "35-44", "45-59", "60+"];
