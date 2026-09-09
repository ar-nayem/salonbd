import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatDateLabel, formatTaka, minToTime } from "@/lib/utils";
import { Button, Card, EmptyState, Select } from "@/components/ui";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { AdvanceButton, CloseBookingButtons } from "@/components/advance-button";
import { advanceBookingAction, closeBookingAction } from "../actions";
import { isTerminal } from "@/lib/status";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardBookings({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const { shopId } = await requireShopPage();
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
    include: {
      staff: { select: { name: true } },
      station: { select: { name: true } },
      items: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.bookings")}</h1>

      <form className="card flex flex-wrap items-end gap-3 rounded-2xl p-3" method="GET">
        <div className="min-w-[10rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("common.status")}</label>
          <Select name="status" defaultValue={sp.status ?? "ALL"}>
            <option value="ALL">{t("common.all")}</option>
            {["PENDING", "CONFIRMED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
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
                    {formatDateLabel(b.date, locale)} · {minToTime(b.startMin, locale)} –{" "}
                    {minToTime(b.endMin, locale)}
                    {b.staff ? ` · ${b.staff.name}` : ""}
                    {b.station ? ` · ${b.station.name}` : ""}
                  </p>
                  <p className="muted text-xs">{b.items.map((i) => i.name).join(", ")}</p>
                  {b.bookingFor === "OTHER" && b.recipientName ? (
                    <p className="text-xs">
                      {t("book.forOther")}: {b.recipientName}
                      {b.recipientPhone ? ` · ${b.recipientPhone}` : ""}
                    </p>
                  ) : null}
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

              <div className="flex flex-wrap items-center gap-2">
                {!isTerminal(b.status) ? (
                  <>
                    <AdvanceButton
                      status={b.status}
                      fulfilment={b.fulfilment}
                      bookingId={b.id}
                      action={advanceBookingAction}
                    />
                    <CloseBookingButtons bookingId={b.id} action={closeBookingAction} />
                  </>
                ) : null}
                <Link
                  href={`/dashboard/messages?booking=${b.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm"
                >
                  <MessageSquare size={14} /> {t("msg.messageCustomer")}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
