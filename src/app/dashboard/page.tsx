import Link from "next/link";
import { CalendarCheck, Clock, Star, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka, minToTime, todayISO } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  const [shop, todays, pending, monthAgg] = await Promise.all([
    db.shop.findUnique({
      where: { id: shopId },
      select: { name: true, slug: true, ratingAvg: true, reviewCount: true, isVerified: true },
    }),
    db.booking.findMany({
      where: { shopId, date: today, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      orderBy: { startMin: "asc" },
      include: { staff: { select: { name: true } }, items: { select: { name: true } } },
    }),
    db.booking.count({ where: { shopId, status: "PENDING" } }),
    db.booking.aggregate({
      where: { shopId, date: { gte: monthStart }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{shop?.name}</h1>
          <Link href={`/shops/${shop?.slug}`} className="text-sm text-brand-600 hover:underline">
            View public page
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<CalendarCheck size={16} />} label={t("dash.todayBookings")} value={String(todays.length)} />
        <Stat icon={<Clock size={16} />} label={t("dash.pending")} value={String(pending)} />
        <Stat
          icon={<Wallet size={16} />}
          label={t("dash.revenueMonth")}
          value={formatTaka(monthAgg._sum.total ?? 0, locale)}
        />
        <Stat
          icon={<Star size={16} />}
          label={t("dash.rating")}
          value={shop?.ratingAvg ? `${shop.ratingAvg} (${shop.reviewCount})` : "—"}
        />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide">{t("dash.todayBookings")}</h2>
        {todays.length === 0 ? (
          <EmptyState title={t("bookings.empty")} />
        ) : (
          <div className="space-y-2">
            {todays.map((b) => (
              <Card key={b.id} className="flex items-center gap-4 p-3">
                <span className="w-20 shrink-0 text-sm font-semibold">{minToTime(b.startMin, locale)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.customerName}</p>
                  <p className="muted truncate text-xs">
                    {b.items.map((i) => i.name).join(", ")}
                    {b.staff ? ` · ${b.staff.name}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatTaka(b.total, locale)}</span>
                <StatusBadge status={b.status} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="muted flex items-center gap-1.5 text-xs">
        {icon} {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </Card>
  );
}
