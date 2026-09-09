import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const AREAS = [
  { area: "Dhanmondi", city: "Dhaka", district: "Dhaka", lat: 23.7461, lng: 90.376 },
  { area: "Gulshan", city: "Dhaka", district: "Dhaka", lat: 23.7925, lng: 90.4078 },
  { area: "Mirpur DOHS", city: "Dhaka", district: "Dhaka", lat: 23.8331, lng: 90.3676 },
  { area: "Uttara", city: "Dhaka", district: "Dhaka", lat: 23.8759, lng: 90.3795 },
  { area: "Bashundhara R/A", city: "Dhaka", district: "Dhaka", lat: 23.8203, lng: 90.4265 },
  { area: "Agrabad", city: "Chattogram", district: "Chattogram", lat: 22.3268, lng: 91.8065 },
  { area: "Zindabazar", city: "Sylhet", district: "Sylhet", lat: 24.8949, lng: 91.8687 },
];

const SHOPS = [
  { name: "Gentleman's Cut", nameBn: "জেন্টলম্যান'স কাট", type: "MEN" },
  { name: "Style Studio", nameBn: "স্টাইল স্টুডিও", type: "UNISEX" },
  { name: "Glow Beauty Parlour", nameBn: "গ্লো বিউটি পার্লার", type: "WOMEN" },
  { name: "Classic Barber House", nameBn: "ক্ল্যাসিক বারবার হাউস", type: "MEN" },
  { name: "Urban Scissors", nameBn: "আরবান সিজরস", type: "UNISEX" },
  { name: "Royal Grooming Lounge", nameBn: "রয়্যাল গ্রুমিং লাউঞ্জ", type: "MEN" },
  { name: "Bridal Bliss", nameBn: "ব্রাইডাল ব্লিস", type: "WOMEN" },
];

const MEN_SERVICES = [
  { name: "Haircut", nameBn: "চুল কাটা", category: "HAIR", price: 250, durationMin: 30 },
  { name: "Beard trim", nameBn: "দাড়ি ট্রিম", category: "BEARD", price: 150, durationMin: 20 },
  { name: "Shave", nameBn: "শেভ", category: "BEARD", price: 120, durationMin: 20 },
  { name: "Hair colour", nameBn: "হেয়ার কালার", category: "COLOR", price: 900, durationMin: 60 },
  { name: "Head massage", nameBn: "হেড ম্যাসাজ", category: "MASSAGE", price: 300, durationMin: 30 },
  { name: "Facial", nameBn: "ফেসিয়াল", category: "FACIAL", price: 700, durationMin: 45 },
];

const WOMEN_SERVICES = [
  { name: "Haircut & blow dry", nameBn: "হেয়ারকাট ও ব্লো ড্রাই", category: "HAIR", price: 800, durationMin: 60 },
  { name: "Facial", nameBn: "ফেসিয়াল", category: "FACIAL", price: 1500, durationMin: 60 },
  { name: "Hair colour", nameBn: "হেয়ার কালার", category: "COLOR", price: 2500, durationMin: 90 },
  { name: "Bridal makeover", nameBn: "ব্রাইডাল মেকওভার", category: "BRIDAL", price: 12000, durationMin: 180 },
  { name: "Manicure", nameBn: "ম্যানিকিউর", category: "SPA", price: 600, durationMin: 45 },
];

const STAFF_NAMES = ["Rakib", "Sabbir", "Jahid", "Nusrat", "Tania", "Imran", "Shakil", "Farhana"];

function token() {
  return randomBytes(12).toString("base64url");
}

async function main() {
  console.log("Seeding...");
  const passwordHash = await bcrypt.hash("password123", 10);

  await db.user.upsert({
    where: { email: "admin@salonbd.app" },
    update: { role: "ADMIN" },
    create: {
      name: "Platform Admin",
      email: "admin@salonbd.app",
      phone: "01700000000",
      passwordHash,
      role: "ADMIN",
    },
  });

  await db.user.upsert({
    where: { email: "customer@salonbd.app" },
    update: {},
    create: {
      name: "Ariful Islam",
      email: "customer@salonbd.app",
      phone: "01711111111",
      passwordHash,
      role: "CUSTOMER",
      dateOfBirth: new Date("1994-04-12"),
    },
  });

  // A second customer so demographics and customer lists are not single-row.
  await db.user.upsert({
    where: { email: "rimi@salonbd.app" },
    update: {},
    create: {
      name: "Rimi Akter",
      email: "rimi@salonbd.app",
      phone: "01712222222",
      passwordHash,
      role: "CUSTOMER",
      dateOfBirth: new Date("2001-09-30"),
    },
  });

  const staffUser = await db.user.upsert({
    where: { email: "staff1@salonbd.app" },
    update: {},
    create: {
      name: "Sabbir Ahmed",
      email: "staff1@salonbd.app",
      phone: "01799999999",
      passwordHash,
      role: "STAFF",
    },
  });

  for (let i = 0; i < SHOPS.length; i++) {
    const meta = SHOPS[i];
    const place = AREAS[i % AREAS.length];
    const slug = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const owner = await db.user.upsert({
      where: { email: `owner${i + 1}@salonbd.app` },
      update: { role: "OWNER" },
      create: {
        name: `${meta.name} Owner`,
        email: `owner${i + 1}@salonbd.app`,
        phone: `0172000000${i + 1}`,
        passwordHash,
        role: "OWNER",
      },
    });

    let shop = await db.shop.findUnique({ where: { slug } });
    if (!shop) {
      shop = await db.shop.create({
        data: {
          ownerId: owner.id,
          name: meta.name,
          nameBn: meta.nameBn,
          slug,
          phone: `0173000000${i + 1}`,
          address: `House ${10 + i}, Road ${2 + i}`,
          area: place.area,
          city: place.city,
          district: place.district,
          lat: place.lat,
          lng: place.lng,
          shopType: meta.type,
          about: `${meta.name} has served ${place.area} for years. Walk in, or book a slot and skip the wait.`,
          aboutBn: `${meta.nameBn} বহু বছর ধরে ${place.area} এলাকায় সেবা দিয়ে আসছে। সরাসরি আসুন, অথবা স্লট বুক করে অপেক্ষা এড়ান।`,
          // One shop is left PENDING so the admin approval queue is not empty.
          status: i === SHOPS.length - 1 ? "PENDING" : "ACTIVE",
          isVerified: i % 3 !== 2,
          acceptsCash: true,
          acceptsOnline: i % 2 === 0,
          depositPercent: i % 2 === 0 ? 20 : 0,
          queueEnabled: true,
          hours: {
            create: Array.from({ length: 7 }, (_, weekday) => ({
              weekday,
              openMin: 10 * 60,
              closeMin: 22 * 60,
              isClosed: weekday === 5 && i % 2 === 0,
            })),
          },
        },
      });
    } else {
      await db.shop.update({
        where: { id: shop.id },
        data: { lat: shop.lat ?? place.lat, lng: shop.lng ?? place.lng },
      });
    }

    const catalogue = meta.type === "WOMEN" ? WOMEN_SERVICES : MEN_SERVICES;
    if ((await db.service.count({ where: { shopId: shop.id } })) === 0) {
      for (const [index, entry] of catalogue.entries()) {
        await db.service.create({ data: { ...entry, shopId: shop.id, sort: index } });
      }
    }

    // Options and add-ons on the first service of every shop.
    const firstService = await db.service.findFirst({
      where: { shopId: shop.id },
      orderBy: { sort: "asc" },
    });
    if (firstService && (await db.serviceOptionGroup.count({ where: { serviceId: firstService.id } })) === 0) {
      await db.serviceOptionGroup.create({
        data: {
          serviceId: firstService.id,
          name: "Style",
          nameBn: "স্টাইল",
          required: false,
          maxSelect: 1,
          options: {
            create: [
              { name: "Regular", nameBn: "রেগুলার", priceDelta: 0, durationDelta: 0, sort: 0 },
              { name: "Scissor cut", nameBn: "সিজর কাট", priceDelta: 100, durationDelta: 15, sort: 1 },
              { name: "Fade", nameBn: "ফেড", priceDelta: 150, durationDelta: 15, sort: 2 },
            ],
          },
        },
      });
      await db.serviceAddon.createMany({
        data: [
          { serviceId: firstService.id, name: "Hair wash", nameBn: "হেয়ার ওয়াশ", price: 100, durationMin: 10 },
          { serviceId: firstService.id, name: "Blow dry", nameBn: "ব্লো ড্রাই", price: 150, durationMin: 10 },
        ],
      });
    }

    if ((await db.staff.count({ where: { shopId: shop.id } })) === 0) {
      const staffCount = 2 + (i % 3);
      for (let n = 0; n < staffCount; n++) {
        await db.staff.create({
          data: {
            shopId: shop.id,
            name: STAFF_NAMES[(i + n) % STAFF_NAMES.length],
            title: n === 0 ? "Senior barber" : "Barber",
            sort: n,
          },
        });
      }
    }

    // Chairs, each with its own printable code.
    if ((await db.station.count({ where: { shopId: shop.id } })) === 0) {
      for (let n = 1; n <= 2; n++) {
        const station = await db.station.create({
          data: { shopId: shop.id, name: `Chair ${n}`, sort: n },
        });
        await db.qrCode.create({
          data: { token: token(), type: "STATION", shopId: shop.id, stationId: station.id, label: station.name },
        });
      }
    }

    if ((await db.qrCode.count({ where: { shopId: shop.id, type: "SHOP" } })) === 0) {
      await db.qrCode.create({
        data: { token: token(), type: "SHOP", shopId: shop.id, label: "Shop poster" },
      });
      await db.qrCode.create({
        data: { token: token(), type: "CATALOG", shopId: shop.id, label: "Price list" },
      });
    }

    // The staff account works at the first shop, to exercise multi-shop access.
    if (i === 0) {
      await db.shopMember.upsert({
        where: { userId_shopId: { userId: staffUser.id, shopId: shop.id } },
        create: { userId: staffUser.id, shopId: shop.id, role: "STAFF" },
        update: {},
      });
    }
  }

  await db.promo.upsert({
    where: { code: "SALONBD10" },
    update: {},
    create: {
      code: "SALONBD10",
      type: "PERCENT",
      value: 10,
      minAmount: 300,
      maxDiscount: 200,
      perUserLimit: 3,
    },
  });

  console.log("Done.");
  console.log("  admin@salonbd.app / password123");
  console.log("  owner1@salonbd.app / password123");
  console.log("  staff1@salonbd.app / password123  (staff of Gentleman's Cut)");
  console.log("  customer@salonbd.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
