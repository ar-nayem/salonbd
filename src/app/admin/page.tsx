import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatTaka, todayISO } from "@/lib/utils";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const { locale } = await getT();
  const monthStart = todayISO().slice(0, 8) + "01";

  const [shops, pendingShops, users, bookings, revenue] = await Promise.all([
    db.shop.count(),
    db.shop.count({ where: { isVerified: false } }),
    db.user.count(),
    db.booking.count({ where: { date: { gte: monthStart } } }),
    db.booking.aggregate({
      where: { status: "COMPLETED", date: { gte: monthStart } },
      _sum: { total: true },
    }),
  ]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat label="Shops" value={String(shops)} />
      <Stat label="Awaiting verification" value={String(pendingShops)} />
      <Stat label="Users" value={String(users)} />
      <Stat label="Bookings this month" value={String(bookings)} />
      <Stat label="GMV this month" value={formatTaka(revenue._sum.total ?? 0, locale)} />
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
