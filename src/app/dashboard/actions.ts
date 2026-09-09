"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireShopPage } from "@/lib/tenancy";
import { advanceBooking, shopCloseBooking } from "@/lib/booking-flow";
import { createQr } from "@/lib/qr";
import { saveUpload } from "@/lib/uploads";
import { notify } from "@/lib/notifications";
import { inputToMin, normalizePhone, slugify, todayISO } from "@/lib/utils";
import { recomputeShopRating } from "@/lib/booking";

/**
 * Resolves the shop this action may touch from the caller's session. A shop id
 * in the form is only ever used to pick between shops the caller already
 * belongs to — it is never trusted on its own.
 */
async function ownerShop(shopId?: string) {
  const access = await requireShopPage(shopId || undefined);
  return { user: access.user, shopId: access.shopId };
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
    status: (["AVAILABLE", "SOLD_OUT", "HIDDEN"].includes(str(form, "status"))
      ? str(form, "status")
      : "AVAILABLE") as "AVAILABLE" | "SOLD_OUT" | "HIDDEN",
    // A discount only counts when it actually undercuts the price.
    discountPrice:
      form.get("discountPrice") && num(form, "discountPrice") > 0 && num(form, "discountPrice") < num(form, "price")
        ? num(form, "discountPrice")
        : null,
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
    await db.service.updateMany({ where: { id, shopId }, data: { status: "HIDDEN" } });
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
    status: (["AVAILABLE", "SOLD_OUT", "HIDDEN"].includes(str(form, "status"))
      ? str(form, "status")
      : "AVAILABLE") as "AVAILABLE" | "SOLD_OUT" | "HIDDEN",
    // A discount only counts when it actually undercuts the price.
    discountPrice:
      form.get("discountPrice") && num(form, "discountPrice") > 0 && num(form, "discountPrice") < num(form, "price")
        ? num(form, "discountPrice")
        : null,
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

/** Advances exactly one step, using the shared status map. */
export async function advanceBookingAction(form: FormData) {
  const { user, shopId } = await ownerShop();
  await advanceBooking({
    bookingId: str(form, "id"),
    shopId,
    to: (str(form, "to") || undefined) as never,
    byUserId: user.id,
  });
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard");
}

export async function closeBookingAction(form: FormData) {
  const { user, shopId } = await ownerShop();
  const status = str(form, "status") === "NO_SHOW" ? "NO_SHOW" : "CANCELLED";
  await shopCloseBooking({
    bookingId: str(form, "id"),
    shopId,
    status,
    byUserId: user.id,
    reason: str(form, "reason") || null,
  });
  revalidatePath("/dashboard/board");
  revalidatePath("/dashboard/bookings");
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

// ---------------- Chairs (stations) ----------------

export async function saveStation(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const id = str(form, "id");
  const data = {
    name: str(form, "name"),
    area: str(form, "area") || null,
    isActive: bool(form, "isActive"),
    sort: num(form, "sort"),
  };
  if (!data.name) return;

  if (id) {
    await db.station.updateMany({ where: { id, shopId }, data });
  } else {
    const station = await db.station.create({ data: { ...data, shopId } });
    // Every chair gets its own printable code.
    await createQr({ type: "STATION", shopId, stationId: station.id, label: station.name });
  }
  revalidatePath("/dashboard/stations");
  revalidatePath("/dashboard/qr");
}

export async function deleteStation(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const used = await db.booking.count({ where: { stationId: id } });
  if (used > 0) {
    await db.station.updateMany({ where: { id, shopId }, data: { isActive: false } });
  } else {
    await db.station.deleteMany({ where: { id, shopId } });
  }
  revalidatePath("/dashboard/stations");
}

// ---------------- QR codes ----------------

export async function createQrCode(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const type = str(form, "type");
  const allowed = ["SHOP", "CATALOG", "SERVICE", "STATION", "COUNTER", "PROMOTION", "LOCATION", "REGISTRATION"];
  if (!allowed.includes(type)) return;

  await createQr({
    type: type as never,
    shopId,
    serviceId: str(form, "serviceId") || null,
    stationId: str(form, "stationId") || null,
    promoId: str(form, "promoId") || null,
    label: str(form, "label") || null,
    targetPath: str(form, "targetPath") || null,
  });
  revalidatePath("/dashboard/qr");
}

export async function toggleQrCode(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const code = await db.qrCode.findFirst({ where: { id, shopId } });
  if (!code) return;
  await db.qrCode.update({ where: { id }, data: { isActive: !code.isActive } });
  revalidatePath("/dashboard/qr");
}

// ---------------- Team access ----------------

export async function addTeamMember(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const contact = str(form, "contact");
  const role = ["OWNER", "MANAGER", "STAFF"].includes(str(form, "role")) ? str(form, "role") : "STAFF";

  const phone = normalizePhone(contact);
  const person = await db.user.findFirst({
    where: { OR: [...(phone ? [{ phone }] : []), { email: contact.toLowerCase() }] },
  });
  if (!person) return;

  await db.shopMember.upsert({
    where: { userId_shopId: { userId: person.id, shopId } },
    create: { userId: person.id, shopId, role },
    update: { role },
  });

  // Staff need a role that unlocks the dashboard, but never an elevated one.
  if (person.role === "CUSTOMER") {
    await db.user.update({ where: { id: person.id }, data: { role: "STAFF" } });
  }

  await notify.send({
    userId: person.id,
    type: "TEAM",
    title: "Shop access granted",
    body: "You were added to a shop team on SalonBD.",
    href: "/dashboard",
  });

  revalidatePath("/dashboard/team");
}

export async function removeTeamMember(form: FormData) {
  const { shopId } = await ownerShop();
  await db.shopMember.deleteMany({ where: { id: str(form, "id"), shopId } });
  revalidatePath("/dashboard/team");
}

// ---------------- Service options and add-ons ----------------

async function assertServiceInShop(serviceId: string, shopId: string) {
  const service = await db.service.findFirst({ where: { id: serviceId, shopId }, select: { id: true } });
  return Boolean(service);
}

export async function saveOptionGroup(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const serviceId = str(form, "serviceId");
  if (!(await assertServiceInShop(serviceId, shopId))) return;

  const id = str(form, "id");
  const data = {
    name: str(form, "name"),
    nameBn: str(form, "nameBn") || null,
    required: bool(form, "required"),
    maxSelect: Math.max(1, num(form, "maxSelect", 1)),
    sort: num(form, "sort"),
  };
  if (!data.name) return;

  if (id) {
    await db.serviceOptionGroup.updateMany({ where: { id, serviceId }, data });
  } else {
    await db.serviceOptionGroup.create({ data: { ...data, serviceId } });
  }
  revalidatePath("/dashboard/services");
}

export async function saveOption(form: FormData) {
  const { shopId } = await ownerShop();
  const groupId = str(form, "groupId");
  const group = await db.serviceOptionGroup.findFirst({
    where: { id: groupId, service: { shopId } },
    select: { id: true },
  });
  if (!group) return;

  const name = str(form, "name");
  if (!name) return;

  await db.serviceOption.create({
    data: {
      groupId,
      name,
      nameBn: str(form, "nameBn") || null,
      priceDelta: num(form, "priceDelta"),
      durationDelta: num(form, "durationDelta"),
    },
  });
  revalidatePath("/dashboard/services");
}

export async function deleteOption(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const option = await db.serviceOption.findFirst({
    where: { id, group: { service: { shopId } } },
    select: { id: true },
  });
  if (!option) return;
  await db.serviceOption.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

export async function deleteOptionGroup(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const group = await db.serviceOptionGroup.findFirst({
    where: { id, service: { shopId } },
    select: { id: true },
  });
  if (!group) return;
  await db.serviceOptionGroup.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

export async function saveAddon(form: FormData) {
  const { shopId } = await ownerShop(str(form, "shopId"));
  const serviceId = str(form, "serviceId");
  if (!(await assertServiceInShop(serviceId, shopId))) return;

  const name = str(form, "name");
  if (!name) return;

  await db.serviceAddon.create({
    data: {
      serviceId,
      name,
      nameBn: str(form, "nameBn") || null,
      price: Math.max(0, num(form, "price")),
      durationMin: Math.max(0, num(form, "durationMin")),
    },
  });
  revalidatePath("/dashboard/services");
}

export async function deleteAddon(form: FormData) {
  const { shopId } = await ownerShop();
  const id = str(form, "id");
  const addon = await db.serviceAddon.findFirst({
    where: { id, service: { shopId } },
    select: { id: true },
  });
  if (!addon) return;
  await db.serviceAddon.delete({ where: { id } });
  revalidatePath("/dashboard/services");
}

// ---------------- Image upload ----------------

/** Takes the file itself. Nobody is asked to paste an image URL. */
export async function uploadServiceImage(form: FormData) {
  const { user, shopId } = await ownerShop(str(form, "shopId"));
  const serviceId = str(form, "serviceId");
  if (!(await assertServiceInShop(serviceId, shopId))) return;

  const file = form.get("file");
  const result = await saveUpload(file instanceof File ? file : null, { uploaderId: user.id });
  if (!result.ok) return;

  await db.service.update({ where: { id: serviceId }, data: { imageUrl: result.url } });
  revalidatePath("/dashboard/services");
}

export async function uploadShopImage(form: FormData) {
  const { user, shopId } = await ownerShop(str(form, "shopId"));
  const file = form.get("file");
  const result = await saveUpload(file instanceof File ? file : null, { uploaderId: user.id });
  if (!result.ok) return;

  if (str(form, "target") === "COVER") {
    await db.shop.update({ where: { id: shopId }, data: { coverUrl: result.url } });
  } else {
    await db.shopImage.create({ data: { shopId, url: result.url, caption: str(form, "caption") || null } });
  }
  revalidatePath("/dashboard/settings");
}
