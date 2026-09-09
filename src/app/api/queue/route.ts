import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone, todayISO } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  shopId: z.string().min(1),
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const limit = rateLimit(`queue:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone);
    if (!phone) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const shop = await db.shop.findUnique({
    where: { id: parsed.data.shopId },
    select: { id: true, queueEnabled: true, isActive: true },
  });
  if (!shop || !shop.isActive || !shop.queueEnabled) {
    return NextResponse.json({ error: "QUEUE_CLOSED" }, { status: 409 });
  }

  const date = todayISO();
  const last = await db.queueToken.findFirst({
    where: { shopId: shop.id, date },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const token = await db.queueToken.create({
    data: {
      shopId: shop.id,
      date,
      number: (last?.number ?? 0) + 1,
      name: parsed.data.name,
      phone,
    },
  });

  return NextResponse.json({ ok: true, number: token.number });
}
