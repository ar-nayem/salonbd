import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const AREAS = [
  { area: "Dhanmondi", city: "Dhaka", district: "Dhaka" },
  { area: "Gulshan", city: "Dhaka", district: "Dhaka" },
  { area: "Mirpur DOHS", city: "Dhaka", district: "Dhaka" },
  { area: "Uttara", city: "Dhaka", district: "Dhaka" },
  { area: "Bashundhara R/A", city: "Dhaka", district: "Dhaka" },
  { area: "Agrabad", city: "Chattogram", district: "Chattogram" },
  { area: "Zindabazar", city: "Sylhet", district: "Sylhet" },
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

async function main() {
  console.log("Seeding...");

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@salonbd.app" },
    update: {},
    create: {
      name: "Platform Admin",
      email: "admin@salonbd.app",
      phone: "01700000000",
      passwordHash,
      role: "ADMIN",
    },
  });

  const customer = await db.user.upsert({
    where: { email: "customer@salonbd.app" },
    update: {},
    create: {
      name: "Ariful Islam",
      email: "customer@salonbd.app",
      phone: "01711111111",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  for (let i = 0; i < SHOPS.length; i++) {
    const meta = SHOPS[i];
    const place = AREAS[i % AREAS.length];
    const slug = meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const existing = await db.shop.findUnique({ where: { slug } });
    if (existing) continue;

    const owner = await db.user.upsert({
      where: { email: `owner${i + 1}@salonbd.app` },
      update: {},
      create: {
        name: `${meta.name} Owner`,
        email: `owner${i + 1}@salonbd.app`,
        phone: `0172000000${i + 1}`,
        passwordHash,
        role: "OWNER",
      },
    });

    const shop = await db.shop.create({
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
        shopType: meta.type,
        about: `${meta.name} has served ${place.area} for years. Walk in, or book a slot and skip the wait.`,
        aboutBn: `${meta.nameBn} বহু বছর ধরে ${place.area} এলাকায় সেবা দিয়ে আসছে। সরাসরি আসুন, অথবা স্লট বুক করে অপেক্ষা এড়ান।`,
        isVerified: i % 3 !== 2,
        acceptsCash: true,
        acceptsOnline: i % 2 === 0,
        depositPercent: i % 2 === 0 ? 20 : 0,
        queueEnabled: true,
        coverUrl: null,
        hours: {
          create: Array.from({ length: 7 }, (_, weekday) => ({
            weekday,
            openMin: 10 * 60,
            closeMin: 22 * 60,
            isClosed: weekday === 5 && i % 2 === 0, // some shops close Friday
          })),
        },
      },
    });

    const catalogue = meta.type === "WOMEN" ? WOMEN_SERVICES : MEN_SERVICES;
    await db.service.createMany({
      data: catalogue.map((s, idx) => ({ ...s, shopId: shop.id, sort: idx })),
    });

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
  console.log("  customer@salonbd.app / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
