"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function num(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

export async function setShopVerified(form: FormData) {
  await requireAdmin();
  await db.shop.update({
    where: { id: str(form, "id") },
    data: { isVerified: str(form, "value") === "true" },
  });
  revalidatePath("/admin/shops");
}

export async function setShopActive(form: FormData) {
  await requireAdmin();
  await db.shop.update({
    where: { id: str(form, "id") },
    data: { isActive: str(form, "value") === "true" },
  });
  revalidatePath("/admin/shops");
}

export async function setShopCommission(form: FormData) {
  await requireAdmin();
  const percent = Math.max(0, Math.min(50, num(form, "commission", 10)));
  await db.shop.update({
    where: { id: str(form, "id") },
    data: { commissionRate: percent / 100 },
  });
  revalidatePath("/admin/shops");
}

export async function setUserBlocked(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  if (id === admin.id) return;
  await db.user.update({ where: { id }, data: { isBlocked: str(form, "value") === "true" } });
  revalidatePath("/admin/users");
}

export async function setUserRole(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const role = str(form, "role");
  if (id === admin.id) return;
  if (!["CUSTOMER", "OWNER", "ADMIN"].includes(role)) return;
  await db.user.update({ where: { id }, data: { role: role as never } });
  revalidatePath("/admin/users");
}

export async function savePlatformPromo(form: FormData) {
  await requireAdmin();
  const code = str(form, "code").toUpperCase();
  if (!code) return;

  const data = {
    code,
    shopId: null,
    type: str(form, "type") === "FLAT" ? "FLAT" : "PERCENT",
    value: Math.max(1, num(form, "value")),
    minAmount: Math.max(0, num(form, "minAmount")),
    maxDiscount: form.get("maxDiscount") ? num(form, "maxDiscount") : null,
    usageLimit: form.get("usageLimit") ? num(form, "usageLimit") : null,
    perUserLimit: Math.max(1, num(form, "perUserLimit", 1)),
    endsAt: str(form, "endsAt") ? new Date(str(form, "endsAt")) : null,
    isActive: true,
  };

  const existing = await db.promo.findUnique({ where: { code } });
  if (existing) {
    await db.promo.update({ where: { code }, data });
  } else {
    await db.promo.create({ data });
  }
  revalidatePath("/admin/promos");
}

export async function togglePlatformPromo(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const promo = await db.promo.findUnique({ where: { id } });
  if (!promo) return;
  await db.promo.update({ where: { id }, data: { isActive: !promo.isActive } });
  revalidatePath("/admin/promos");
}

export async function generatePayouts(form: FormData) {
  await requireAdmin();
  const periodStart = str(form, "periodStart");
  const periodEnd = str(form, "periodEnd");
  if (!periodStart || !periodEnd) return;

  const shops = await db.shop.findMany({ select: { id: true, commissionRate: true } });

  for (const shop of shops) {
    const agg = await db.booking.aggregate({
      where: { shopId: shop.id, status: "COMPLETED", date: { gte: periodStart, lte: periodEnd } },
      _sum: { total: true },
    });
    const gross = agg._sum.total ?? 0;
    if (gross === 0) continue;

    const commission = Math.round(gross * shop.commissionRate);
    const existing = await db.payout.findFirst({
      where: { shopId: shop.id, periodStart, periodEnd },
    });
    if (existing) {
      await db.payout.update({
        where: { id: existing.id },
        data: { gross, commission, net: gross - commission },
      });
    } else {
      await db.payout.create({
        data: { shopId: shop.id, periodStart, periodEnd, gross, commission, net: gross - commission },
      });
    }
  }
  revalidatePath("/admin/payouts");
}

export async function markPayoutPaid(form: FormData) {
  await requireAdmin();
  await db.payout.update({
    where: { id: str(form, "id") },
    data: { status: "PAID", paidAt: new Date(), note: str(form, "note") || null },
  });
  revalidatePath("/admin/payouts");
}
