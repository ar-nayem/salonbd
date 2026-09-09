import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createBooking } from "@/lib/booking";
import { normalizePhone } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  shopId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1).max(8),
  staffId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.number().int().min(0).max(1439),
  customerName: z.string().trim().min(2).max(60),
  customerPhone: z.string().trim().min(6),
  notes: z.string().trim().max(500).optional(),
  promoCode: z.string().trim().max(30).optional(),
  paymentMethod: z.enum(["CASH", "ONLINE"]),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const limit = rateLimit(`booking:${user.id}:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });

  const result = await createBooking({
    ...parsed.data,
    customerPhone: phone,
    customerId: user.id,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result);
}
