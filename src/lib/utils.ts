import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Asia/Dhaka is UTC+6 with no DST. */
export const DHAKA_OFFSET_MIN = 360;

export function nowInDhaka(): Date {
  const now = new Date();
  return new Date(now.getTime() + DHAKA_OFFSET_MIN * 60_000);
}

/** yyyy-mm-dd for "today" in Dhaka. */
export function todayISO(): string {
  return nowInDhaka().toISOString().slice(0, 10);
}

/** Minutes since midnight, right now, in Dhaka. */
export function nowMinutes(): number {
  const d = nowInDhaka();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

/** Bangla speakers name the part of the day rather than saying AM/PM. */
function bnDayPart(hour: number): string {
  if (hour < 6) return "রাত";
  if (hour < 12) return "সকাল";
  if (hour < 16) return "দুপুর";
  if (hour < 18) return "বিকাল";
  if (hour < 20) return "সন্ধ্যা";
  return "রাত";
}

export function minToTime(min: number, locale: string = "en"): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hhmm = `${h12}:${String(m).padStart(2, "0")}`;
  if (locale === "bn") return `${bnDayPart(h)} ${toBnDigits(hhmm)}`;
  return `${hhmm} ${h >= 12 ? "PM" : "AM"}`;
}

/** Digits in the reader's script. */
export function formatNumber(value: number | string, locale: string = "en"): string {
  return locale === "bn" ? toBnDigits(value) : String(value);
}

export function minToInput(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function inputToMin(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export function formatTaka(amount: number, locale: string = "en"): string {
  const s = new Intl.NumberFormat("en-US").format(Math.round(amount));
  return locale === "bn" ? `৳${toBnDigits(s)}` : `৳${s}`;
}

export function formatDateLabel(iso: string, locale: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(locale === "bn" ? "bn-BD" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Bangladeshi mobile numbers, stored as 01XXXXXXXXX. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  let local = digits;
  if (local.startsWith("880")) local = local.slice(3);
  else if (local.startsWith("0")) local = local.slice(1);
  if (!/^1[3-9]\d{8}$/.test(local)) return null;
  return "0" + local;
}

export function bookingCode(): string {
  const chars = "ACDEFGHJKLMNPQRSTUVWXYZ2345679";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return "SB" + out;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}
