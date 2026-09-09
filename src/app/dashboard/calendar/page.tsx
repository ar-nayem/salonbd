import Link from "next/link";
import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { addDaysISO, formatDateLabel, minToTime, todayISO } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const { shopId } = await requireOwnerShopId();
  const { locale, t } = await getT();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  const [staff, bookings] = await Promise.all([
    db.staff.findMany({ where: { shopId, isActive: true }, orderBy: { sort: "asc" } }),
    db.booking.findMany({
      where: { shopId, date, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      orderBy: { startMin: "asc" },
      include: { items: { select: { name: true } } },
    }),
  ]);

  const columns = staff.length > 0 ? staff : [{ id: "__shop__", name: t("book.anyStaff") }];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("dash.calendar")}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/dashboard/calendar?date=${addDaysISO(date, -1)}`} className="rounded-lg border px-3 py-2">
            ←
          </Link>
          <span className="font-medium">{formatDateLabel(date, locale)}</span>
          <Link href={`/dashboard/calendar?date=${addDaysISO(date, 1)}`} className="rounded-lg border px-3 py-2">
            →
          </Link>
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState title={t("bookings.empty")} />
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(12rem, 1fr))` }}>
          {columns.map((col) => {
            const list = bookings.filter((b) =>
              col.id === "__shop__" ? true : b.staffId === col.id,
            );
            return (
              <div key={col.id} className="space-y-2">
                <p className="text-sm font-semibold">{col.name}</p>
                {list.length === 0 ? (
                  <p className="muted text-xs">—</p>
                ) : (
                  list.map((b) => (
                    <Card key={b.id} className="p-3">
                      <p className="text-sm font-semibold">
                        {minToTime(b.startMin, locale)} – {minToTime(b.endMin, locale)}
                      </p>
                      <p className="truncate text-sm">{b.customerName}</p>
                      <p className="muted truncate text-xs">{b.items.map((i) => i.name).join(", ")}</p>
                    </Card>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
