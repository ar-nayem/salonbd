import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({ shopId: z.string().min(1), saved: z.boolean() });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const key = { userId_shopId: { userId: user.id, shopId: parsed.data.shopId } };
  if (parsed.data.saved) {
    await db.favorite.upsert({
      where: key,
      create: { userId: user.id, shopId: parsed.data.shopId },
      update: {},
    });
  } else {
    await db.favorite.deleteMany({ where: { userId: user.id, shopId: parsed.data.shopId } });
  }
  return NextResponse.json({ ok: true });
}
