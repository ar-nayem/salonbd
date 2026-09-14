import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { BookingStatus } from "@prisma/client";
import { DHAKA_OFFSET_MIN } from "./utils";
import { publicBaseUrl } from "./qr";

/**
 * Minimal RFC 5545 writer. Hand-rolled rather than a dependency because the
 * two details that break real calendars are easy to get wrong in a library's
 * defaults: lines must fold at 75 *octets* (Bangla is 3 bytes a character, so
 * folding by characters corrupts the text), and every line ends in CRLF.
 */

/** Alarms the phone's own calendar raises. Apple Calendar honours these. */
export const ALARMS = [
  { trigger: "-P1D", key: "DAY_BEFORE" },
  { trigger: "-PT1H", key: "HOUR_BEFORE" },
] as const;

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds one content line at 75 octets without splitting a UTF-8 character. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Step back off UTF-8 continuation bytes (10xxxxxx).
    while (end < bytes.length && end > start && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines start with a space, which counts
  }
  return parts.join("\r\n ");
}

/** Bookings are stored as local Dhaka wall-clock time; calendars get UTC. */
export function bookingInstant(date: string, minutes: number): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes - DHAKA_OFFSET_MIN));
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsStatus(status: BookingStatus): string {
  if (status === "CANCELLED" || status === "NO_SHOW") return "CANCELLED";
  if (status === "PENDING") return "TENTATIVE";
  return "CONFIRMED";
}

export type CalendarBooking = {
  id: string;
  code: string;
  date: string;
  startMin: number;
  endMin: number;
  status: BookingStatus;
  updatedAt: Date;
  /** Monotonic change counter, so calendars accept updates. */
  sequence: number;
  shop: { name: string; address: string; area: string; city: string; phone: string; lat: number | null; lng: number | null };
  staffName: string | null;
  items: string[];
  recipientName: string | null;
};

type Copy = {
  at: string;
  code: string;
  barber: string;
  services: string;
  shopPhone: string;
  forWhom: string;
  manage: string;
  reminderDay: string;
  reminderHour: string;
  pending: string;
};

const COPY: Record<"bn" | "en", Copy> = {
  en: {
    at: "at",
    code: "Booking code",
    barber: "Barber",
    services: "Services",
    shopPhone: "Shop phone",
    forWhom: "For",
    manage: "Manage booking",
    reminderDay: "Tomorrow",
    reminderHour: "In 1 hour",
    pending: "waiting for the shop to confirm",
  },
  bn: {
    at: "—",
    code: "বুকিং কোড",
    barber: "বারবার",
    services: "সার্ভিস",
    shopPhone: "শপের ফোন",
    forWhom: "যার জন্য",
    manage: "বুকিং দেখুন",
    reminderDay: "আগামীকাল",
    reminderHour: "১ ঘণ্টা পর",
    pending: "শপের নিশ্চিতকরণের অপেক্ষায়",
  },
};

function vevent(b: CalendarBooking, locale: "bn" | "en", withAlarms: boolean): string[] {
  const c = COPY[locale];
  const base = publicBaseUrl();
  const url = `${base}/bookings/${b.id}`;
  const services = b.items.join(", ");
  const summary =
    locale === "bn"
      ? `${services} — ${b.shop.name}`
      : `${services} ${c.at} ${b.shop.name}`;

  const description = [
    `${c.code}: ${b.code}`,
    b.status === "PENDING" ? `(${c.pending})` : null,
    b.staffName ? `${c.barber}: ${b.staffName}` : null,
    `${c.services}: ${services}`,
    b.recipientName ? `${c.forWhom}: ${b.recipientName}` : null,
    `${c.shopPhone}: ${b.shop.phone}`,
    `${c.manage}: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VEVENT",
    // Stable across downloads and the feed, so re-importing updates rather than duplicates.
    `UID:booking-${b.id}@${new URL(base).host}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `LAST-MODIFIED:${utcStamp(b.updatedAt)}`,
    `SEQUENCE:${b.sequence}`,
    `DTSTART:${utcStamp(bookingInstant(b.date, b.startMin))}`,
    `DTEND:${utcStamp(bookingInstant(b.date, b.endMin))}`,
    `SUMMARY:${escapeText(summary)}`,
    `LOCATION:${escapeText(`${b.shop.name}, ${b.shop.address}, ${b.shop.area}, ${b.shop.city}`)}`,
    ...(b.shop.lat !== null && b.shop.lng !== null ? [`GEO:${b.shop.lat};${b.shop.lng}`] : []),
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    `STATUS:${icsStatus(b.status)}`,
    "TRANSP:OPAQUE",
  ];

  if (withAlarms && icsStatus(b.status) !== "CANCELLED") {
    for (const alarm of ALARMS) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(
          `${alarm.key === "DAY_BEFORE" ? c.reminderDay : c.reminderHour}: ${summary}`,
        )}`,
        `TRIGGER:${alarm.trigger}`,
        "END:VALARM",
      );
    }
  }

  lines.push("END:VEVENT");
  return lines;
}

export function buildCalendar(
  bookings: CalendarBooking[],
  opts: { locale: "bn" | "en"; name?: string; method?: "PUBLISH"; alarms?: boolean; refreshHours?: number },
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SalonBD//Bookings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${opts.method ?? "PUBLISH"}`,
    ...(opts.name ? [`X-WR-CALNAME:${escapeText(opts.name)}`, "X-WR-TIMEZONE:Asia/Dhaka"] : []),
    // Hints for subscribed calendars; Apple honours these, Google polls on its own schedule.
    ...(opts.refreshHours
      ? [`REFRESH-INTERVAL;VALUE=DURATION:PT${opts.refreshHours}H`, `X-PUBLISHED-TTL:PT${opts.refreshHours}H`]
      : []),
    ...bookings.flatMap((b) => vevent(b, opts.locale, opts.alarms ?? true)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Google Calendar's one-tap "add event" link. It cannot carry custom alarms. */
export function googleCalendarUrl(b: CalendarBooking, locale: "bn" | "en"): string {
  const c = COPY[locale];
  const services = b.items.join(", ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: locale === "bn" ? `${services} — ${b.shop.name}` : `${services} ${c.at} ${b.shop.name}`,
    dates: `${utcStamp(bookingInstant(b.date, b.startMin))}/${utcStamp(bookingInstant(b.date, b.endMin))}`,
    details: `${c.code}: ${b.code}\n${c.shopPhone}: ${b.shop.phone}\n${publicBaseUrl()}/bookings/${b.id}`,
    location: `${b.shop.name}, ${b.shop.address}, ${b.shop.area}, ${b.shop.city}`,
    ctz: "Asia/Dhaka",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ---------------- Signed links ----------------

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET missing");
  return s;
}

/**
 * The per-booking .ics link is signed rather than session-gated. An installed
 * PWA on iOS hands .ics links to Safari's calendar sheet without the app's
 * cookies, so a cookie check would 401 exactly where the button matters most.
 */
export function signBooking(bookingId: string): string {
  return createHmac("sha256", secret()).update(`ics:${bookingId}`).digest("base64url").slice(0, 32);
}

export function verifyBookingSignature(bookingId: string, sig: string | null): boolean {
  if (!sig) return false;
  const expected = Buffer.from(signBooking(bookingId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
