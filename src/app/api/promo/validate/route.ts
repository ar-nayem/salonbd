import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { evaluatePromo } from "@/lib/promo";

const schema = z.object({
  code: z.string().trim().min(1).max(30),
  shopId: z.string().min(1),
  subtotal: z.number().int().min(0),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const result = await evaluatePromo({ ...parsed.data, userId: user.id });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason, min: result.min });
  return NextResponse.json(result);
}
