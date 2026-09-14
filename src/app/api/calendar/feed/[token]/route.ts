import { db } from "@/lib/db";
import { buildCalendar } from "@/lib/ics";
import { feedBookings } from "@/lib/calendar";
import { clientIp, rateLimit } from "@/lib/ratelimit";

/**
 * A personal subscription feed. Calendar apps poll it, so every new booking
 * shows up without the customer doing anything per booking, and cancellations
 * arrive as STATUS:CANCELLED on the same UID.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = raw.replace(/\.ics$/i, "");

  const limit = rateLimit(`feed:${clientIp(req)}`, 120, 60 * 60 * 1000);
  if (!limit.ok) return new Response("Too many requests", { status: 429 });

  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });

  const user = await db.user.findUnique({
    where: { calendarToken: token },
    select: { id: true, isBlocked: true },
  });
  if (!user || user.isBlocked) return new Response("Not found", { status: 404 });

  const locale = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "bn";
  const body = buildCalendar(await feedBookings(user.id), {
    locale,
    name: locale === "bn" ? "সেলুনবিডি বুকিং" : "SalonBD bookings",
    alarms: true,
    refreshHours: 1,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="salonbd.ics"',
      "Cache-Control": "private, max-age=300",
    },
  });
}
