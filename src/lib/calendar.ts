import "server-only";
import { randomBytes } from "crypto";
import { db } from "./db";
import { publicBaseUrl } from "./qr";
import { addDaysISO, todayISO } from "./utils";
import type { CalendarBooking } from "./ics";

export const CALENDAR_INCLUDE = {
  shop: {
    select: { name: true, address: true, area: true, city: true, phone: true, lat: true, lng: true },
  },
  staff: { select: { name: true } },
  items: { select: { name: true } },
  _count: { select: { events: true } },
} as const;

type WithCalendarInclude = {
  id: string;
  code: string;
  date: string;
  startMin: number;
  endMin: number;
  status: CalendarBooking["status"];
  updatedAt: Date;
  bookingFor: string;
  recipientName: string | null;
  shop: CalendarBooking["shop"];
  staff: { name: string } | null;
  items: { name: string }[];
  _count: { events: number };
};

export function toCalendarBooking(b: WithCalendarInclude): CalendarBooking {
  return {
    id: b.id,
    code: b.code,
    date: b.date,
    startMin: b.startMin,
    endMin: b.endMin,
    status: b.status,
    updatedAt: b.updatedAt,
    // Every status change writes an event row, so the count only ever grows.
    sequence: b._count.events,
    shop: b.shop,
    staffName: b.staff?.name ?? null,
    items: b.items.map((i) => i.name),
    recipientName: b.bookingFor === "OTHER" ? b.recipientName : null,
  };
}

/** Recent history plus everything upcoming; cancelled rows stay so subscribers see them go. */
export async function feedBookings(userId: string) {
  const rows = await db.booking.findMany({
    where: { customerId: userId, date: { gte: addDaysISO(todayISO(), -30) } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
    take: 200,
    include: CALENDAR_INCLUDE,
  });
  return rows.map(toCalendarBooking);
}

export async function ensureCalendarToken(userId: string, rotate = false): Promise<string> {
  if (!rotate) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { calendarToken: true } });
    if (user?.calendarToken) return user.calendarToken;
  }
  const token = randomBytes(24).toString("base64url");
  await db.user.update({ where: { id: userId }, data: { calendarToken: token } });
  return token;
}

export function feedUrls(token: string, locale: "bn" | "en") {
  const https = `${publicBaseUrl()}/api/calendar/feed/${token}.ics?lang=${locale}`;
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    webcal,
    // Google accepts a webcal URL as a calendar id and offers to add it.
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
  };
}
