import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka, todayISO } from "@/lib/utils";
import { monthKeys, settlements } from "@/lib/analytics";
import { DEFAULT_COMMISSION_RATE } from "@/lib/constants";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const { locale, t } = await getT();

  const to = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : todayISO();
  const from = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : to.slice(0, 8) + "01";

  const rows = await settlements(from, to);

  // Each row is already rounded at the unit that gets settled, so the summary
  // is the sum of the rows — it cannot disagree with them.
  const gross = rows.reduce((sum, r) => sum + r.gross, 0);
  const commission = rows.reduce((sum, r) => sum + r.commission, 0);
  const net = rows.reduce((sum, r) => sum + r.net, 0);

  const months = monthKeys(12);
  const payouts = await db.payout.findMany({
    where: { periodStart: { gte: months[0] + "-01" } },
    include: { shop: { select: { name: true } } },
    orderBy: { periodStart: "desc" },
  });

  const byMonth = months.map((month) => {
    const rowsForMonth = payouts.filter((p) => p.periodStart.startsWith(month));
    return {
      month,
      net: rowsForMonth.reduce((sum, p) => sum + p.net, 0),
      paid: rowsForMonth.filter((p) => p.status === "PAID").length,
      count: rowsForMonth.length,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("an.settlement")}</h2>
        <form method="GET" className="flex items-end gap-2">
          <input type="date" name="from" defaultValue={from} className="h-10 rounded-xl border px-3 text-sm" />
          <input type="date" name="to" defaultValue={to} className="h-10 rounded-xl border px-3 text-sm" />
          <button type="submit" className="h-10 rounded-xl border px-3 text-sm">
            {t("search.apply")}
          </button>
        </form>
      </div>

      <p className="muted text-xs">
        {t("an.paidOnly")} Default commission {Math.round(DEFAULT_COMMISSION_RATE * 100)}%, overridden
        per shop.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Gross" value={formatTaka(gross, locale)} />
        <Stat label="Platform fee" value={formatTaka(commission, locale)} />
        <Stat label="Payable to shops" value={formatTaka(net, locale)} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-3 font-medium">Shop</th>
              <th className="p-3 text-right font-medium">{t("an.bookings")}</th>
              <th className="p-3 text-right font-medium">{t("an.avgOrder")}</th>
              <th className="p-3 text-right font-medium">Gross</th>
              <th className="p-3 text-right font-medium">Fee</th>
              <th className="p-3 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.shopId} className="border-b last:border-0">
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-right tabular-nums">{r.bookings}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(r.avgOrder, locale)}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(r.gross, locale)}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(r.commission, locale)}</td>
                <td className="p-3 text-right font-medium tabular-nums">{formatTaka(r.net, locale)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted p-6 text-center">
                  {t("common.none")}
                </td>
              </tr>
            ) : null}
          </tbody>
          {rows.length > 0 ? (
            <tfoot className="border-t font-semibold">
              <tr>
                <td className="p-3">Total</td>
                <td className="p-3" />
                <td className="p-3" />
                <td className="p-3 text-right tabular-nums">{formatTaka(gross, locale)}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(commission, locale)}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(net, locale)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </Card>

      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">{t("an.payoutHistory")}</p>
        <div className="space-y-1.5 text-sm">
          {byMonth.map((m) => (
            <div key={m.month} className="flex items-center justify-between">
              <span className="muted">{m.month}</span>
              <span className="tabular-nums">
                {formatTaka(m.net, locale)}{" "}
                <span className="muted text-xs">
                  ({m.paid}/{m.count} paid)
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>
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
