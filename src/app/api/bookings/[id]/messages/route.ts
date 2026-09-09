import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { bookingAccess } from "@/lib/booking-access";
import { notify } from "@/lib/notifications";
import { isUsableImageRef } from "@/lib/uploads";

const schema = z.object({
  type: z.enum(["TEXT", "IMAGE"]).default("TEXT"),
  body: z.string().trim().max(2000).optional(),
  imageUrl: z.string().trim().max(500).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const access = await bookingAccess(user, id);
  // Wrong tenant and missing booking answer the same way.
  if (!access.ok || !user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const conversation = await db.conversation.findUnique({
    where: { bookingId: id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ messages: [] });

  // Opening the thread marks the other side's messages read.
  await db.message.updateMany({
    where: {
      conversationId: conversation.id,
      readAt: null,
      senderSide: access.side === "CUSTOMER" ? "SHOP" : "CUSTOMER",
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: conversation.messages.map((m) => ({
      id: m.id,
      side: m.senderSide,
      type: m.type,
      body: m.body,
      imageUrl: m.imageUrl,
      createdAt: m.createdAt,
      mine: m.senderSide === access.side,
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const access = await bookingAccess(user, id);
  if (!access.ok || !user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { type, body, imageUrl } = parsed.data;

  if (type === "TEXT" && !body) return NextResponse.json({ error: "EMPTY" }, { status: 400 });
  if (type === "IMAGE" && (!imageUrl || !isUsableImageRef(imageUrl))) {
    return NextResponse.json({ error: "BAD_IMAGE" }, { status: 400 });
  }

  // Created lazily: most bookings never need a thread.
  const conversation = await db.conversation.upsert({
    where: { bookingId: id },
    create: { bookingId: id, shopId: access.shopId },
    update: { lastMessageAt: new Date() },
  });

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      senderId: user.id,
      senderSide: access.side,
      type,
      body: body ?? null,
      imageUrl: type === "IMAGE" ? imageUrl! : null,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: message.createdAt },
  });

  const booking = await db.booking.findUnique({
    where: { id },
    select: { code: true, customerId: true, shop: { select: { ownerId: true, name: true } } },
  });
  if (booking) {
    await notify.send({
      userId: access.side === "CUSTOMER" ? booking.shop.ownerId : booking.customerId,
      type: "MESSAGE",
      title: "New message",
      body:
        access.side === "CUSTOMER"
          ? `Message about booking ${booking.code}.`
          : `${booking.shop.name} replied about booking ${booking.code}.`,
      href: access.side === "CUSTOMER" ? `/dashboard/messages` : `/bookings/${id}`,
    });
  }

  return NextResponse.json({ ok: true, id: message.id });
}
