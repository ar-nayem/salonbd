import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Armchair, CheckCircle2, Clock, MapPin, Phone, User, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { CUSTOMER_CANCELLABLE } from "@/lib/status";
import { ensureBookingQr } from "@/lib/qr";
import { formatDateLabel, formatNumber, formatTaka, minToTime, nowMinutes, todayISO } from "@/lib/utils";
import { Card } from "@/components/ui";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";
import { BookingTimeline } from "@/components/booking-timeline";
import { MessageThread } from "@/components/message-thread";
import { CancelBooking, ClaimAccount, PayNow, ReviewForm } from "@/components/booking-actions";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; payment?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${id}`);
  const { locale, t } = await getT();

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      shop: {
        select: { name: true, nameBn: true, slug: true, address: true, area: true, city: true, phone: true },
      },
      staff: { select: { name: true } },
      station: { select: { name: true } },
      items: { include: { options: true } },
      events: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
      review: true,
    },
  });
  if (!booking || booking.customerId !== user.id) notFound();

  const guest = await db.user.findUnique({ where: { id: user.id }, select: { isGuest: true } });
  const qr = await ensureBookingQr(booking.id, booking.shopId);

  const outstanding = booking.total - booking.amountPaid;
  const started =
    booking.date < todayISO() || (booking.date === todayISO() && booking.startMin <= nowMinutes());
  const canCancel = CUSTOMER_CANCELLABLE.includes(booking.status) && !started;
  const canPay =
    outstanding > 0 &&
    booking.paymentMethod === "ONLINE" &&
    booking.status !== "CANCELLED" &&
    booking.status !== "COMPLETED";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {sp.new ? (
        <Card className="flex items-start gap-3 border-brand-200 bg-brand-50 p-4 dark:bg-brand-950">
          <CheckCircle2 className="mt-0.5 shrink-0 text-brand-600" size={20} />
          <div>
            <p className="font-semibold">{t("book.success")}</p>
            <p className="muted text-sm">{t("book.successBody")}</p>
          </div>
        </Card>
      ) : null}

      {sp.payment === "failed" ? (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          Payment did not go through, so this booking is not confirmed yet. You can try again below.
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/shops/${booking.shop.slug}`} className="text-lg font-bold hover:underline">
              {locale === "bn" && booking.shop.nameBn ? booking.shop.nameBn : booking.shop.name}
            </Link>
            <p className="muted flex items-center gap-1 text-sm">
              <MapPin size={13} /> {booking.shop.address}, {booking.shop.area}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-4 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="muted text-xs uppercase tracking-wide">{t("bookings.code")}</p>
            <p className="mt-1 text-3xl font-bold tracking-[0.2em]">{booking.code}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${qr.token}/png?size=256`}
            alt={`QR for booking ${booking.code}`}
            className="h-28 w-28 rounded-xl bg-white p-1"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info
            icon={<Clock size={15} />}
            label={t("common.date")}
            value={`${formatDateLabel(booking.date, locale)} · ${minToTime(booking.startMin, locale)} – ${minToTime(booking.endMin, locale)}`}
          />
          <Info icon={<User size={15} />} label={t("dash.staff")} value={booking.staff?.name ?? t("book.anyStaff")} />
          {booking.station ? (
            <Info icon={<Armchair size={15} />} label={t("book.chair")} value={booking.station.name} />
          ) : null}
          <Info icon={<Phone size={15} />} label={t("book.yourPhone")} value={booking.customerPhone} />
          {booking.bookingFor === "OTHER" && booking.recipientName ? (
            <Info
              icon={<UserRound size={15} />}
              label={t("book.forOther")}
              value={`${booking.recipientName}${booking.recipientPhone ? ` · ${booking.recipientPhone}` : ""}`}
            />
          ) : null}
        </div>

        {booking.recipientNote ? (
          <p className="muted rounded-xl bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
            {booking.recipientNote}
          </p>
        ) : null}

        <div className="space-y-1.5 border-t pt-3 text-sm">
          {booking.items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                {i.name}{" "}
                <span className="muted text-xs">· {formatNumber(i.durationMin, locale)} {t("book.min")}</span>
                {i.options.length > 0 ? (
                  <span className="muted block text-xs">{i.options.map((o) => o.name).join(", ")}</span>
                ) : null}
              </span>
              <span>{formatTaka(i.price, locale)}</span>
            </div>
          ))}
          {booking.discount > 0 ? (
            <div className="flex justify-between text-brand-700 dark:text-brand-300">
              <span>{t("book.discount")}</span>
              <span>− {formatTaka(booking.discount, locale)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>{t("book.total")}</span>
            <span>{formatTaka(booking.total, locale)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="muted">{t("book.payment")}</span>
            <span className="flex items-center gap-2">
              <PaymentBadge status={booking.paymentStatus} />
              {outstanding > 0 ? (
                <span className="muted text-xs">
                  {t("book.dueAtShop")}: {formatTaka(outstanding, locale)}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        {booking.notes ? (
          <p className="muted rounded-xl bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">{booking.notes}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {canPay ? (
            <PayNow bookingId={booking.id} label={`${t("book.deposit")} ${formatTaka(outstanding, locale)}`} />
          ) : null}
          <a
            href={`tel:${booking.shop.phone}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <Phone size={16} /> {t("shop.callShop")}
          </a>
          {canCancel ? <CancelBooking bookingId={booking.id} /> : null}
        </div>
      </Card>

      <Card className="p-5">
        <BookingTimeline
          bookingId={booking.id}
          status={booking.status}
          fulfilment={booking.fulfilment}
          events={booking.events.map((e) => ({ status: e.status, createdAt: e.createdAt.toISOString() }))}
        />
      </Card>

      <MessageThread bookingId={booking.id} title={t("msg.messageShop")} />

      {guest?.isGuest ? <ClaimAccount /> : null}

      {booking.status === "COMPLETED" && !booking.review ? (
        <ReviewForm
          bookingId={booking.id}
          items={booking.items.map((i) => ({ id: i.id, name: i.name }))}
          staffName={booking.staff?.name ?? null}
        />
      ) : null}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="muted flex items-center gap-1.5 text-xs">
        {icon} {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
