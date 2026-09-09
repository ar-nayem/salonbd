import "server-only";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { db } from "./db";
import type { QrType } from "@prisma/client";

/**
 * Printed codes are built from the configured public origin, never from the
 * incoming request. Behind a reverse proxy the request URL resolves to the
 * app's internal bind address, and every printed sticker would quietly point
 * at localhost.
 */
export function publicBaseUrl() {
  return (process.env.APP_URL || "http://localhost:4420").replace(/\/$/, "");
}

export function qrUrl(token: string) {
  return `${publicBaseUrl()}/q/${token}`;
}

function newToken() {
  // Opaque and random: no database id, no PII, no destination encoded.
  return randomBytes(12).toString("base64url");
}

export type CreateQrInput = {
  type: QrType;
  shopId?: string | null;
  stationId?: string | null;
  serviceId?: string | null;
  staffId?: string | null;
  bookingId?: string | null;
  queueTokenId?: string | null;
  promoId?: string | null;
  label?: string | null;
  targetPath?: string | null;
};

export async function createQr(input: CreateQrInput) {
  return db.qrCode.create({
    data: {
      token: newToken(),
      type: input.type,
      label: input.label ?? null,
      shopId: input.shopId ?? null,
      stationId: input.stationId ?? null,
      serviceId: input.serviceId ?? null,
      staffId: input.staffId ?? null,
      bookingId: input.bookingId ?? null,
      queueTokenId: input.queueTokenId ?? null,
      promoId: input.promoId ?? null,
      targetPath: input.targetPath ?? null,
    },
  });
}

/** Reuses the booking's code if one exists, so re-printing keeps the same token. */
export async function ensureBookingQr(bookingId: string, shopId: string) {
  const existing = await db.qrCode.findFirst({ where: { bookingId, type: "BOOKING" } });
  if (existing) return existing;
  return createQr({ type: "BOOKING", bookingId, shopId, label: "Booking" });
}

export async function ensureQueueQr(queueTokenId: string, shopId: string) {
  const existing = await db.qrCode.findFirst({ where: { queueTokenId, type: "QUEUE" } });
  if (existing) return existing;
  return createQr({ type: "QUEUE", queueTokenId, shopId, label: "Queue token" });
}

export const QR_INCLUDE = {
  shop: { select: { id: true, slug: true, name: true, ownerId: true } },
  station: { select: { id: true, name: true, shopId: true } },
  service: { select: { id: true, name: true, shopId: true } },
  staff: { select: { id: true, name: true, shopId: true } },
  booking: { select: { id: true, code: true, shopId: true, customerId: true } },
  queueToken: { select: { id: true, number: true, shopId: true, status: true, date: true } },
  promo: { select: { id: true, code: true, shopId: true } },
} as const;

export async function resolveQr(token: string) {
  if (!token || token.length > 64) return null;
  return db.qrCode.findUnique({ where: { token }, include: QR_INCLUDE });
}

export type ResolvedQr = NonNullable<Awaited<ReturnType<typeof resolveQr>>>;

export async function logScan(qrCodeId: string, userId: string | null, userAgent: string | null) {
  await db.$transaction([
    db.qrScan.create({
      data: { qrCodeId, userId, userAgent: userAgent?.slice(0, 200) ?? null },
    }),
    db.qrCode.update({
      where: { id: qrCodeId },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    }),
  ]);
}

/** Where a scan sends a buyer. Staff destinations are decided by the resolver page. */
export function buyerDestination(qr: ResolvedQr): string {
  switch (qr.type) {
    case "SHOP":
    case "CATALOG":
      return qr.shop ? `/shops/${qr.shop.slug}` : "/shops";
    case "SERVICE":
      return qr.shop && qr.service
        ? `/shops/${qr.shop.slug}/book?service=${qr.service.id}`
        : "/shops";
    case "STATION":
      // The token travels onward, never the station id. The page and the
      // booking endpoint each re-resolve it server-side.
      return qr.shop ? `/shops/${qr.shop.slug}/book?qr=${qr.token}` : "/shops";
    case "BOOKING":
      return qr.booking ? `/bookings/${qr.booking.id}` : "/bookings";
    case "QUEUE":
      return qr.shop ? `/shops/${qr.shop.slug}?queue=${qr.token}` : "/shops";
    case "PROMOTION":
      return qr.shop && qr.promo
        ? `/shops/${qr.shop.slug}?promo=${qr.promo.code}`
        : qr.promo
          ? `/shops?promo=${qr.promo.code}`
          : "/shops";
    case "LOCATION":
      return qr.targetPath || "/shops";
    case "REGISTRATION":
      return qr.targetPath || "/signup";
    default:
      return "/";
  }
}

export async function qrPngDataUrl(token: string) {
  return QRCode.toDataURL(qrUrl(token), {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#101821", light: "#ffffff" },
  });
}

export async function qrPngBuffer(token: string, width = 512) {
  return QRCode.toBuffer(qrUrl(token), {
    width,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#101821", light: "#ffffff" },
  });
}
