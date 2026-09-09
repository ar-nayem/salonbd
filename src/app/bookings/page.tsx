import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarX2, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatDateLabel, formatTaka, minToTime, todayISO } from "@/lib/utils";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bookings");
  const { locale, t } = await getT();

  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    orderBy: [{ date: "desc" }, { startMin: "desc" }],
    include: {
      shop: { select: { name: true, nameBn: true, slug: true, area: true, city: true } },
      staff: { select: { name: true } },
      items: { select: { name: true } },
    },
  });

  const today = todayISO();
  const upcoming = bookings.filter(
    (b) => b.date >= today && (b.status === "PENDING" || b.status === "CONFIRMED"),
  );
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("bookings.title")}</h1>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={28} />}
          title={t("bookings.empty")}
          action={<LinkButton href="/shops">{t("nav.explore")}</LinkButton>}
        />
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{t("bookings.upcoming")}</h2>
          {upcoming.map((b) => (
            <BookingRow key={b.id} booking={b} locale={locale} t={t} />
          ))}
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="space-y-2">
          <h2 className="muted text-sm font-semibold uppercase tracking-wide">{t("bookings.past")}</h2>
          {past.map((b) => (
            <BookingRow key={b.id} booking={b} locale={locale} t={t} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

type Row = {
  id: string;
  code: string;
  date: string;
  startMin: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  total: number;
  shop: { name: string; nameBn: string | null; slug: string; area: string; city: string };
  staff: { name: string } | null;
  items: { name: string }[];
};

function BookingRow({
  booking,
  locale,
  t,
}: {
  booking: Row;
  locale: string;
  t: (k: string) => string;
}) {
  const shopName = locale === "bn" && booking.shop.nameBn ? booking.shop.nameBn : booking.shop.name;
  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card className="flex items-center gap-4 p-4 transition hover:shadow-sm">
        <div className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-center dark:bg-brand-950">
          <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
            {formatDateLabel(booking.date, locale)}
          </p>
          <p className="text-sm font-bold">{minToTime(booking.startMin, locale)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{shopName}</p>
          <p className="muted flex items-center gap-1 truncate text-xs">
            <MapPin size={11} /> {booking.shop.area}
            {booking.staff ? ` · ${booking.staff.name}` : ""}
          </p>
          <p className="muted truncate text-xs">{booking.items.map((i) => i.name).join(", ")}</p>
        </div>
        <div className="shrink-0 space-y-1 text-right">
          <StatusBadge status={booking.status} />
          <p className="text-sm font-semibold">{formatTaka(booking.total, locale)}</p>
          <p className="muted text-[11px]">
            {t("bookings.code")} {booking.code}
          </p>
        </div>
      </Card>
    </Link>
  );
}
