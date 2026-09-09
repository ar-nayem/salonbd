import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka, todayISO } from "@/lib/utils";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();

  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: { commissionRate: true },
  });

  const completed = await db.booking.findMany({
    where: { shopId, status: "COMPLETED" },
    orderBy: { date: "desc" },
    select: { id: true, date: true, code: true, total: true, amountPaid: true, paymentMethod: true },
    take: 300,
  });

  const month = completed.filter((b) => b.date >= monthStart);
  const gross = month.reduce((sum, b) => sum + b.total, 0);
  const online = month.filter((b) => b.paymentMethod === "ONLINE").reduce((s, b) => s + b.amountPaid, 0);
  const commission = Math.round(gross * (shop?.commissionRate ?? 0.1));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.earnings")}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross this month" value={formatTaka(gross, locale)} />
        <Stat label="Collected online" value={formatTaka(online, locale)} />
        <Stat
          label={`Platform fee (${Math.round((shop?.commissionRate ?? 0.1) * 100)}%)`}
          value={formatTaka(commission, locale)}
        />
        <Stat label="Net" value={formatTaka(gross - commission, locale)} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-3 font-medium">{t("common.date")}</th>
              <th className="p-3 font-medium">{t("bookings.code")}</th>
              <th className="p-3 font-medium">{t("book.payment")}</th>
              <th className="p-3 text-right font-medium">{t("book.total")}</th>
            </tr>
          </thead>
          <tbody>
            {completed.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="p-3">{b.date}</td>
                <td className="p-3">{b.code}</td>
                <td className="p-3">{b.paymentMethod}</td>
                <td className="p-3 text-right font-medium">{formatTaka(b.total, locale)}</td>
              </tr>
            ))}
            {completed.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted p-6 text-center">
                  {t("common.none")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
