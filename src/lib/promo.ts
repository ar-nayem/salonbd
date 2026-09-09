import "server-only";
import { db } from "./db";

export type PromoResult =
  | { ok: true; promoId: string; code: string; discount: number }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "MIN_AMOUNT" | "LIMIT" | "OTHER_SHOP"; min?: number };

export async function evaluatePromo(opts: {
  code: string;
  shopId: string;
  userId: string;
  subtotal: number;
}): Promise<PromoResult> {
  const promo = await db.promo.findUnique({
    where: { code: opts.code.trim().toUpperCase() },
  });
  if (!promo || !promo.isActive) return { ok: false, reason: "NOT_FOUND" };
  if (promo.shopId && promo.shopId !== opts.shopId) return { ok: false, reason: "OTHER_SHOP" };

  const now = new Date();
  if (promo.startsAt > now) return { ok: false, reason: "EXPIRED" };
  if (promo.endsAt && promo.endsAt < now) return { ok: false, reason: "EXPIRED" };
  if (opts.subtotal < promo.minAmount) return { ok: false, reason: "MIN_AMOUNT", min: promo.minAmount };
  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, reason: "LIMIT" };
  }

  const mine = await db.promoRedemption.count({
    where: { promoId: promo.id, userId: opts.userId },
  });
  if (mine >= promo.perUserLimit) return { ok: false, reason: "LIMIT" };

  let discount =
    promo.type === "PERCENT" ? Math.floor((opts.subtotal * promo.value) / 100) : promo.value;
  if (promo.maxDiscount !== null) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.min(discount, opts.subtotal);

  return { ok: true, promoId: promo.id, code: promo.code, discount };
}
