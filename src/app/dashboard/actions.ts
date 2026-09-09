"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { inputToMin, normalizePhone, slugify, todayISO } from "@/lib/utils";
import { recomputeShopRating } from "@/lib/booking";

async function ownerShop(shopId?: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  if (shopId) {
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { id: true, ownerId: true } });
    if (!shop) redirect("/dashboard");
    if (shop.ownerId !== user.id && user.role !== "ADMIN") redirect("/dashboard");
    return { user, shopId: shop.id };
  }

  const shop = await db.shop.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  if (!shop) redirect("/dashboard/new");
  return { user, shopId: shop.id };
}

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function num(form: FormData, key: string, fallback = 0) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}
function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}

// ---------------- Shop ----------------

export async function createShop(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/new");

  const name = str(form, "name");
  const phoneRaw = str(form, "phone");
  const phone = normalizePhone(phoneRaw) ?? phoneRaw;
  if (name.length < 2) return;

  let slug = slugify(name) || `shop-${Date.now()}`;
  if (await db.shop.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const shop = await db.shop.create({
    data: {
      ownerId: user.id,
      name,
      nameBn: str(form, "nameBn") || null,
      slug,
      phone,
      address: str(form, "address"),
      area: str(form, "area"),
      city: str(form, "city") || "Dhaka",
      district: str(form, "district") || str(form, "city") || "Dhaka",
      shopType: str(form, "shopType") || "UNISEX",
      about: str(form, "about") || null,
      hours: {
        create: Array.from({ length: 7 }, (_, weekday) => ({
          weekday,
          openMin: 10 * 60,
          closeMin: 22 * 60,
          isClosed: false,
        })),
      },
    },
  });

  if (user.role === "CUSTOMER") {
    await db.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?created=${shop.id}`);
}

export async function updateShop(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));

  await db.shop.update({
    where: { id: shopId },
    data: {
      name: str(form, "name"),
      nameBn: str(form, "nameBn") || null,
      phone: normalizePhone(str(form, "phone")) ?? str(form, "phone"),
      address: str(form, "address"),
      area: str(form, "area"),
      city: str(form, "city"),
      district: str(form, "district") || str(form, "city"),
      about: str(form, "about") || null,
      aboutBn: str(form, "aboutBn") || null,
      shopType: str(form, "shopType"),
      coverUrl: str(form, "coverUrl") || null,
      lat: form.get("lat") ? num(form, "lat") : null,
      lng: form.get("lng") ? num(form, "lng") : null,
      acceptsCash: bool(form, "acceptsCash"),
      acceptsOnline: bool(form, "acceptsOnline"),
      depositPercent: Math.max(0, Math.min(100, num(form, "depositPercent"))),
      slotStepMin: [10, 15, 20, 30, 60].includes(num(form, "slotStepMin")) ? num(form, "slotStepMin") : 15,
      queueEnabled: bool(form, "queueEnabled"),
      isActive: bool(form, "isActive"),
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/shops");
}

export async function addShopImage(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const url = str(form, "url");
  if (!url) return;
  await db.shopImage.create({
    data: { shopId, url, caption: str(form, "caption") || null, sort: num(form, "sort") },
  });
  revalidatePath("/dashboard/settings");
}

export async function deleteShopImage(form: FormData) {
  const { shopId } = await ownerShop();
  await db.shopImage.deleteMany({ where: { id: str(form, "id"), shopId } });
  revalidatePath("/dashboard/settings");
}

// ---------------- Services ----------------

export async function saveService(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const id = str(form, "id");

  const data = {
    name: str(form, "name"),
    nameBn: str(form, "nameBn") || null,
    category: str(form, "category") || "HAIR",
    description: str(form, "description") || null,
    durationMin: Math.max(5, num(form, "durationMin", 30)),
    price: Math.max(0, num(form, "price")),
    isActive: bool(form, "isActive"),
    sort: num(form, "sort"),
  };
  if (!data.name) return;

  if (id) {
    await db.service.updateMany({ where: { id, shopId }, data });
  } else {
    await db.service.create({ data: { ...data, shopId } });
  }
  revalidatePath("/dashboard/services");
}

export async function deleteService(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  // Keep history intact: retire instead of deleting when the service has bookings.
  const used = await db.bookingItem.count({ where: { serviceId: id } });
  if (used > 0) {
    await db.service.updateMany({ where: { id, shopId }, data: { isActive: false } });
  } else {
    await db.service.deleteMany({ where: { id, shopId } });
  }
  revalidatePath("/dashboard/services");
}

// ---------------- Staff ----------------

export async function saveStaff(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const id = str(form, "id");
  const serviceIds = form.getAll("serviceIds").map(String).filter(Boolean);

  const data = {
    name: str(form, "name"),
    title: str(form, "title") || null,
    bio: str(form, "bio") || null,
    avatarUrl: str(form, "avatarUrl") || null,
    isActive: bool(form, "isActive"),
    sort: num(form, "sort"),
  };
  if (!data.name) return;

  const staff = id
    ? await db.staff.update({ where: { id }, data })
    : await db.staff.create({ data: { ...data, shopId } });

  await db.staffService.deleteMany({ where: { staffId: staff.id } });
  if (serviceIds.length > 0) {
    await db.staffService.createMany({
      data: serviceIds.map((serviceId) => ({ staffId: staff.id, serviceId })),
    });
  }
  revalidatePath("/dashboard/staff");
}

export async function deleteStaff(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const used = await db.booking.count({ where: { staffId: id } });
  if (used > 0) {
    await db.staff.updateMany({ where: { id, shopId }, data: { isActive: false } });
  } else {
    await db.staff.deleteMany({ where: { id, shopId } });
  }
  revalidatePath("/dashboard/staff");
}

// ---------------- Hours & closures ----------------

export async function saveHours(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));

  for (let weekday = 0; weekday < 7; weekday++) {
    const closed = bool(form, `closed-${weekday}`);
    const open = str(form, `open-${weekday}`) || "10:00";
    const close = str(form, `close-${weekday}`) || "22:00";

    const existing = await db.workingHour.findFirst({ where: { shopId, weekday, staffId: null } });
    const data = {
      openMin: inputToMin(open),
      closeMin: inputToMin(close),
      isClosed: closed,
    };
    if (existing) {
      await db.workingHour.update({ where: { id: existing.id }, data });
    } else {
      await db.workingHour.create({ data: { ...data, shopId, weekday } });
    }
  }
  revalidatePath("/dashboard/hours");
}

export async function addClosure(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const date = str(form, "date");
  if (!date) return;
  const staffId = str(form, "staffId") || null;

  await db.closure.create({
    data: {
      shopId: staffId ? null : shopId,
      staffId,
      date,
      reason: str(form, "reason") || null,
      startMin: form.get("startMin") ? inputToMin(str(form, "startMin")) : null,
      endMin: form.get("endMin") ? inputToMin(str(form, "endMin")) : null,
    },
  });
  revalidatePath("/dashboard/hours");
}

export async function deleteClosure(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const closure = await db.closure.findUnique({ where: { id }, include: { staff: true } });
  if (!closure) return;
  if (closure.shopId !== shopId && closure.staff?.shopId !== shopId) return;
  await db.closure.delete({ where: { id } });
  revalidatePath("/dashboard/hours");
}

// ---------------- Bookings ----------------

export async function setBookingStatus(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const status = str(form, "status") as "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  if (!["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(status)) return;

  const booking = await db.booking.findFirst({ where: { id, shopId } });
  if (!booking) return;

  await db.booking.update({
    where: { id },
    data: {
      status,
      // A completed visit means the balance was settled at the chair,
      // whether it was all cash or the remainder after an online deposit.
      ...(status === "COMPLETED"
        ? { paymentStatus: "PAID" as const, amountPaid: booking.total, dueAtShop: 0 }
        : {}),
    },
  });

  if (status === "COMPLETED") {
    await db.shop.update({ where: { id: shopId }, data: { bookingCount: { increment: 1 } } });
  }

  await db.notification.create({
    data: {
      userId: booking.customerId,
      title: `Booking ${status.toLowerCase()}`,
      body: `Your booking ${booking.code} is now ${status.toLowerCase()}.`,
      href: `/bookings/${booking.id}`,
    },
  });

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

// ---------------- Queue ----------------

export async function addQueueToken(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const name = str(form, "name");
  if (!name) return;
  const date = todayISO();
  const last = await db.queueToken.findFirst({
    where: { shopId, date },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  await db.queueToken.create({
    data: {
      shopId,
      date,
      number: (last?.number ?? 0) + 1,
      name,
      phone: normalizePhone(str(form, "phone")),
      staffId: str(form, "staffId") || null,
    },
  });
  revalidatePath("/dashboard/queue");
}

export async function setQueueStatus(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const status = str(form, "status") as "WAITING" | "SERVING" | "DONE" | "SKIPPED";
  if (!["WAITING", "SERVING", "DONE", "SKIPPED"].includes(status)) return;

  const token = await db.queueToken.findFirst({ where: { id, shopId } });
  if (!token) return;

  if (status === "SERVING") {
    await db.queueToken.updateMany({
      where: { shopId, date: token.date, status: "SERVING" },
      data: { status: "DONE", servedAt: new Date() },
    });
  }

  await db.queueToken.update({
    where: { id },
    data: { status, servedAt: status === "DONE" ? new Date() : token.servedAt },
  });
  revalidatePath("/dashboard/queue");
}

// ---------------- Reviews ----------------

export async function replyToReview(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const reply = str(form, "reply").slice(0, 600);
  const review = await db.review.findFirst({ where: { id, shopId } });
  if (!review) return;
  await db.review.update({ where: { id }, data: { reply: reply || null, repliedAt: new Date() } });
  revalidatePath("/dashboard/reviews");
  await recomputeShopRating(shopId);
}

// ---------------- Promos ----------------

export async function savePromo(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const id = str(form, "id");
  const code = str(form, "code").toUpperCase();
  if (!code) return;

  const data = {
    code,
    type: str(form, "type") === "FLAT" ? "FLAT" : "PERCENT",
    value: Math.max(1, num(form, "value")),
    minAmount: Math.max(0, num(form, "minAmount")),
    maxDiscount: form.get("maxDiscount") ? num(form, "maxDiscount") : null,
    usageLimit: form.get("usageLimit") ? num(form, "usageLimit") : null,
    perUserLimit: Math.max(1, num(form, "perUserLimit", 1)),
    endsAt: str(form, "endsAt") ? new Date(str(form, "endsAt")) : null,
    isActive: bool(form, "isActive"),
  };

  if (id) {
    await db.promo.updateMany({ where: { id, shopId }, data });
  } else {
    const clash = await db.promo.findUnique({ where: { code } });
    if (clash) return;
    await db.promo.create({ data: { ...data, shopId } });
  }
  revalidatePath("/dashboard/promos");
}

export async function deletePromo(form: FormData) {
  const { shopId } = await ownerShop();
  await db.promo.deleteMany({ where: { id: str(form, "id"), shopId } });
  revalidatePath("/dashboard/promos");
}
