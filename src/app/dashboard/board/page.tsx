import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka, minToTime, todayISO } from "@/lib/utils";
import { Card } from "@/components/ui";
import { AdvanceButton, CloseBookingButtons } from "@/components/advance-button";
import { advanceBookingAction, closeBookingAction } from "../actions";
import { AutoRefresh } from "@/components/auto-refresh";
import type { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const COLUMNS: { key: string; statuses: BookingStatus[] }[] = [
  { key: "ops.new", statuses: ["PENDING"] },
  { key: "status.CONFIRMED", statuses: ["CONFIRMED"] },
  { key: "ops.accepted", statuses: ["ACCEPTED", "READY"] },
  { key: "ops.inProgress", statuses: ["IN_PROGRESS"] },
  { key: "ops.completed", statuses: ["COMPLETED"] },
  { key: "ops.cancelled", statuses: ["CANCELLED", "NO_SHOW"] },
];

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  const bookings = await db.booking.findMany({
    where: { shopId, date },
    orderBy: { startMin: "asc" },
    include: {
      staff: { select: { name: true } },
      station: { select: { name: true } },
      items: { select: { id: true, name: true } },
    },
  });

  return (
    <div className="space-y-4">
      {/* New bookings land without anyone refreshing. */}
      <AutoRefresh seconds={20} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("ops.board")}</h1>
        <form method="GET" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="h-10 rounded-xl border px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-xl border px-3 text-sm">
            {t("search.apply")}
          </button>
        </form>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {COLUMNS.map((column) => {
          const list = bookings.filter((b) => column.statuses.includes(b.status));
          return (
            <div key={column.key} className="w-72 shrink-0 space-y-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-semibold">{t(column.key)}</p>
                <span className="muted text-xs">{list.length}</span>
              </div>

              {list.map((b) => (
                <Card key={b.id} className="space-y-2 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{minToTime(b.startMin, locale)}</span>
                    <span className="muted text-[11px]">{b.code}</span>
                  </div>
                  <p className="truncate text-sm font-medium">{b.customerName}</p>
                  <p className="muted truncate text-xs">{b.items.map((i) => i.name).join(", ")}</p>
                  <p className="muted truncate text-xs">
                    {b.staff?.name ?? t("book.anyStaff")}
                    {b.station ? ` · ${b.station.name}` : ""}
                    {b.fulfilment === "HOME_SERVICE" ? " · home" : ""}
                  </p>
                  {b.bookingFor === "OTHER" && b.recipientName ? (
                    <p className="text-xs">
                      {t("book.forOther")}: {b.recipientName}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-sm font-semibold">{formatTaka(b.total, locale)}</span>
                    <AdvanceButton
                      status={b.status}
                      fulfilment={b.fulfilment}
                      bookingId={b.id}
                      action={advanceBookingAction}
                    />
                  </div>
                  {column.key === "ops.new" || column.key === "status.CONFIRMED" ? (
                    <CloseBookingButtons bookingId={b.id} action={closeBookingAction} />
                  ) : null}
                </Card>
              ))}

              {list.length === 0 ? <p className="muted px-1 text-xs">—</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
