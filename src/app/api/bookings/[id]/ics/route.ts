import { db } from "@/lib/db";
import { buildCalendar, verifyBookingSignature } from "@/lib/ics";
import { CALENDAR_INCLUDE, toCalendarBooking } from "@/lib/calendar";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);

  // Same 404 for a bad signature and a missing booking.
  if (!verifyBookingSignature(id, url.searchParams.get("sig"))) {
    return new Response("Not found", { status: 404 });
  }

  const booking = await db.booking.findUnique({ where: { id }, include: CALENDAR_INCLUDE });
  if (!booking) return new Response("Not found", { status: 404 });

  const locale = url.searchParams.get("lang") === "en" ? "en" : "bn";
  const body = buildCalendar([toCalendarBooking(booking)], { locale, alarms: true });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // inline: iOS Safari shows its "Add to Calendar" sheet instead of saving a file.
      "Content-Disposition": `inline; filename="salonbd-${booking.code}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
