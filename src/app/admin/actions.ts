"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/tenancy";
import { notify } from "@/lib/notifications";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // Checked against the admin roles explicitly, not merely "logged in".
  if (!isAdmin(user.role)) notFound();
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

/** Moves a shop through the platform lifecycle and tells the owner why. */
export async function setShopStatus(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const status = str(form, "status");
  if (!["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"].includes(status)) return;

  const shop = await db.shop.update({
    where: { id },
    data: { status: status as never, statusNote: str(form, "note") || null },
    select: { ownerId: true, name: true },
  });

  await notify.send({
    userId: shop.ownerId,
    type: "SHOP_STATUS",
    title: `${shop.name} is now ${status.toLowerCase()}`,
    body:
      status === "ACTIVE"
        ? "Your shop is live and can take bookings."
        : status === "SUSPENDED"
          ? "Your shop is suspended and hidden from customers."
          : status === "CLOSED"
            ? "Your shop is closed on SalonBD."
            : "Your shop is waiting for approval.",
    href: "/dashboard",
  });

  revalidatePath("/admin/shops");
  revalidatePath("/shops");
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
  if (!["CUSTOMER", "STAFF", "OWNER", "ADMIN", "SUPER_ADMIN"].includes(role)) return;
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
