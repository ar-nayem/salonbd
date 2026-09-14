import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { bookingInstant } from "./ics";
import { getEmailSender, getSmsSender } from "./notifications";
import { pushToUser } from "./push";
import { addDaysISO, minToTime, todayISO } from "./utils";
import { publicBaseUrl } from "./qr";

export const REMINDER_WINDOWS = [
  { kind: "DAY_BEFORE", leadMin: 24 * 60 },
  { kind: "HOUR_BEFORE", leadMin: 60 },
] as const;

/** Statuses where the customer is still expected to turn up. */
const REMINDABLE = ["PENDING", "CONFIRMED", "ACCEPTED", "READY"] as const;

export type ReminderRun = {
  checked: number;
  sent: { bookingId: string; code: string; kind: string; channels: string[] }[];
  skipped: number;
};

/**
 * Called by cron every few minutes. Each (booking, kind) is claimed with a
 * unique row before anything is sent, so overlapping runs or a retry can never
 * remind someone twice.
 */
export async function runReminders(now = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { checked: 0, sent: [], skipped: 0 };

  // Anything that can fall inside a window starts between today and two days out.
  const bookings = await db.booking.findMany({
    where: {
      status: { in: [...REMINDABLE] },
      date: { gte: addDaysISO(todayISO(), -1), lte: addDaysISO(todayISO(), 2) },
    },
    include: {
      shop: { select: { name: true, nameBn: true, phone: true } },
      customer: { select: { id: true, email: true, phone: true, locale: true, isGuest: true } },
      items: { select: { name: true } },
      reminders: { select: { kind: true } },
    },
  });

  for (const booking of bookings) {
    run.checked += 1;
    const start = bookingInstant(booking.date, booking.startMin);
    const minutesToStart = (start.getTime() - now.getTime()) / 60_000;
    if (minutesToStart <= 0) continue;

    // Pick the single most relevant window. If cron was down through the
    // day-before window, the hour-before reminder replaces it rather than
    // sending a stale "tomorrow" message an hour before the visit.
    const due = [...REMINDER_WINDOWS]
      .reverse()
      .find((w) => minutesToStart <= w.leadMin);
    if (!due) continue;
    if (booking.reminders.some((r) => r.kind === due.kind)) continue;

    // Booked inside the window already: the confirmation screen was the reminder.
    const bookedMinutesBefore = (start.getTime() - booking.createdAt.getTime()) / 60_000;
    if (bookedMinutesBefore <= due.leadMin) {
      run.skipped += 1;
      continue;
    }

    try {
      await db.bookingReminder.create({ data: { bookingId: booking.id, kind: due.kind } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }

    const channels = await deliver(booking, due.kind);
    await db.bookingReminder.update({
      where: { bookingId_kind: { bookingId: booking.id, kind: due.kind } },
      data: { channels: channels.join(",") },
    });
    run.sent.push({ bookingId: booking.id, code: booking.code, kind: due.kind, channels });
  }

  return run;
}

type DeliverBooking = {
  id: string;
  code: string;
  date: string;
  startMin: number;
  status: string;
  customerId: string;
  shop: { name: string; nameBn: string | null; phone: string };
  customer: { id: string; email: string | null; phone: string | null; locale: string };
  items: { name: string }[];
};

async function deliver(booking: DeliverBooking, kind: string): Promise<string[]> {
  const bn = booking.customer.locale !== "en";
  const shopName = bn && booking.shop.nameBn ? booking.shop.nameBn : booking.shop.name;
  const time = minToTime(booking.startMin, bn ? "bn" : "en");
  const services = booking.items.map((i) => i.name).join(", ");

  // The clock time is in both, so a reminder read late still says when to be there.
  const title = bn
    ? kind === "DAY_BEFORE"
      ? `আগামীকাল ${time} — ${shopName}`
      : `আজ ${time} (১ ঘণ্টার মধ্যে) — ${shopName}`
    : kind === "DAY_BEFORE"
      ? `Tomorrow at ${time} — ${shopName}`
      : `Today at ${time} (within the hour) — ${shopName}`;

  const pendingNote =
    booking.status === "PENDING"
      ? bn
        ? " শপ এখনো নিশ্চিত করেনি।"
        : " The shop has not confirmed yet."
      : "";

  const body = bn
    ? `${services} · কোড ${booking.code}.${pendingNote}`
    : `${services} · code ${booking.code}.${pendingNote}`;

  const href = `/bookings/${booking.id}`;
  const channels: string[] = [];

  // Written directly rather than via notify.send, which would also push — the
  // reminder push below carries a per-booking tag so repeats collapse on the phone.
  await db.notification.create({
    data: { userId: booking.customerId, type: "REMINDER", title, body, href },
  });
  channels.push("inapp");

  const push = await pushToUser(booking.customerId, {
    title,
    body,
    url: href,
    tag: `reminder-${booking.id}-${kind}`,
  });
  if (push.sent > 0) channels.push("push");

  // Email and SMS go out only when a real provider is wired in. The
  // placeholders report failure, so they are never counted as delivered.
  const link = `${publicBaseUrl()}${href}`;
  if (booking.customer.email) {
    const email = await getEmailSender().send({
      to: booking.customer.email,
      subject: title,
      text: `${body}\n\n${link}`,
    });
    if (email.ok) channels.push("email");
  }
  if (booking.customer.phone) {
    const sms = await getSmsSender().send({ to: booking.customer.phone, text: `${title}. ${body} ${link}` });
    if (sms.ok) channels.push("sms");
  }

  return channels;
}

