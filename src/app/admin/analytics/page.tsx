import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka } from "@/lib/utils";
import { PAID_WHERE, revenueSeries, settlements, dayKeys } from "@/lib/analytics";
import { Card } from "@/components/ui";
import { BarRows, Sparkbars } from "@/components/bar-chart";

export const dynamic = "force-dynamic";

const WINDOWS = [7, 30, 90];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const { locale, t } = await getT();
  const days = WINDOWS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const from = dayKeys(days)[0];

  const [series, topShops, items, areas, split] = await Promise.all([
    revenueSeries(days),
    settlements(from, dayKeys(days).at(-1)!),
    db.bookingItem.groupBy({
      by: ["name"],
      where: { booking: { ...PAID_WHERE, date: { gte: from } } },
      _sum: { price: true },
      _count: true,
      orderBy: { _sum: { price: "desc" } },
      take: 8,
    }),
    db.booking.findMany({
      where: { ...PAID_WHERE, date: { gte: from } },
      select: { total: true, shop: { select: { area: true } } },
    }),
    db.booking.groupBy({
      by: ["fulfilment"],
      where: { ...PAID_WHERE, date: { gte: from } },
      _count: true,
    }),
  ]);

  const revenue = series.reduce((sum, d) => sum + d.revenue, 0);
  const bookings = series.reduce((sum, d) => sum + d.bookings, 0);

  const byArea = Object.entries(
    areas.reduce<Record<string, number>>((acc, row) => {
      acc[row.shop.area] = (acc[row.shop.area] ?? 0) + row.total;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("an.sales")}</h2>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Link
              key={w}
              href={`/admin/analytics?days=${w}`}
              className={
                w === days
                  ? "rounded-xl bg-brand-600 px-3 py-2 text-sm text-white"
                  : "rounded-xl border px-3 py-2 text-sm"
              }
            >
              {t(`an.days${w}`)}
            </Link>
          ))}
        </div>
      </div>

      <p className="muted text-xs">{t("an.paidOnly")}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("an.revenue")} value={formatTaka(revenue, locale)} />
        <Stat label={t("an.bookings")} value={String(bookings)} />
        <Stat
          label={t("an.avgOrder")}
          value={formatTaka(bookings > 0 ? Math.round(revenue / bookings) : 0, locale)}
        />
      </div>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">{t("an.revenue")}</p>
        <Sparkbars
          data={series.map((d) => ({ key: d.key, value: d.revenue }))}
          format={(v) => formatTaka(v, locale)}
        />
        <div className="muted mt-2 flex justify-between text-xs">
          <span>{series[0]?.key}</span>
          <span>{series.at(-1)?.key}</span>
        </div>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">{t("an.bookings")}</p>
        <Sparkbars
          data={series.map((d) => ({ key: d.key, value: d.bookings }))}
          format={(v) => String(v)}
        />
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">{t("an.topShops")}</p>
          <BarRows
            data={topShops.slice(0, 8).map((s) => ({ label: s.name, value: s.gross }))}
            format={(v) => formatTaka(v, locale)}
          />
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">{t("an.bestServices")}</p>
          <BarRows
            data={items.map((i) => ({ label: i.name, value: i._sum.price ?? 0 }))}
            format={(v) => formatTaka(v, locale)}
            tone="gold"
          />
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">{t("an.byArea")}</p>
          <BarRows
            data={byArea.map(([area, total]) => ({ label: area, value: total }))}
            format={(v) => formatTaka(v, locale)}
            tone="ink"
          />
        </Card>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold">{t("an.splitFulfilment")}</p>
          <BarRows
            data={split.map((s) => ({
              label: s.fulfilment === "IN_SHOP" ? "In shop" : "Home service",
              value: s._count,
            }))}
            format={(v) => String(v)}
          />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="muted text-xs">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </Card>
  );
}
