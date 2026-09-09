import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { formatDateLabel, formatTaka, minToTime, todayISO } from "@/lib/utils";
import { Button, Card, EmptyState, Select } from "@/components/ui";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { setBookingStatus } from "../actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardBookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const { shopId } = await requireOwnerShopId();
  const { locale, t } = await getT();

  const where: Prisma.BookingWhereInput = {
    shopId,
    ...(sp.status && sp.status !== "ALL" ? { status: sp.status as never } : {}),
    ...(sp.date ? { date: sp.date } : {}),
  };

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ date: "desc" }, { startMin: "desc" }],
    take: 100,
    include: { staff: { select: { name: true } }, items: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.bookings")}</h1>

      <form className="card flex flex-wrap items-end gap-3 rounded-2xl p-3" method="GET">
        <div className="min-w-[10rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("common.status")}</label>
          <Select name="status" defaultValue={sp.status ?? "ALL"}>
            <option value="ALL">{t("common.all")}</option>
            {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("common.date")}</label>
          <input
            type="date"
            name="date"
            defaultValue={sp.date ?? ""}
            className="h-11 w-full rounded-xl border px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="dark">
          {t("search.apply")}
        </Button>
      </form>

      {bookings.length === 0 ? (
        <EmptyState title={t("bookings.empty")} />
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Card key={b.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {b.customerName} · <span className="muted text-sm">{b.customerPhone}</span>
                  </p>
                  <p className="muted text-sm">
                    {formatDateLabel(b.date, locale)} · {minToTime(b.startMin, locale)} – {minToTime(b.endMin, locale)}
                    {b.staff ? ` · ${b.staff.name}` : ""}
                  </p>
                  <p className="muted text-xs">{b.items.map((i) => i.name).join(", ")}</p>
                  {b.notes ? <p className="mt-1 text-xs italic">{b.notes}</p> : null}
                </div>
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={b.status} />
                    <PaymentBadge status={b.paymentStatus} />
                  </div>
                  <p className="font-semibold">{formatTaka(b.total, locale)}</p>
                  <p className="muted text-[11px]">{b.code}</p>
                </div>
              </div>

              {b.status === "PENDING" || b.status === "CONFIRMED" ? (
                <div className="flex flex-wrap gap-2">
                  {b.status === "PENDING" ? (
                    <StatusForm id={b.id} status="CONFIRMED" label={t("status.CONFIRMED")} />
                  ) : null}
                  <StatusForm id={b.id} status="COMPLETED" label={t("status.COMPLETED")} variant="dark" />
                  <StatusForm id={b.id} status="NO_SHOW" label={t("status.NO_SHOW")} variant="outline" />
                  <StatusForm id={b.id} status="CANCELLED" label={t("status.CANCELLED")} variant="outline" />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusForm({
  id,
  status,
  label,
  variant = "primary",
}: {
  id: string;
  status: string;
  label: string;
  variant?: "primary" | "outline" | "dark";
}) {
  return (
    <form action={setBookingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button size="sm" variant={variant} type="submit">
        {label}
      </Button>
    </form>
  );
}
