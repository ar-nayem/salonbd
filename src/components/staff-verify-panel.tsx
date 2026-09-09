"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import type { BookingStatus, Fulfilment } from "@prisma/client";
import { Button, Card } from "./ui";
import { StatusBadge } from "./status-badge";
import { useI18n } from "./locale-provider";
import { nextStatus } from "@/lib/status";
import { formatTaka, minToTime } from "@/lib/utils";

type VerifyBooking = {
  id: string;
  code: string;
  status: BookingStatus;
  fulfilment: Fulfilment;
  date: string;
  startMin: number;
  endMin: number;
  customerName: string;
  customerPhone: string;
  recipientName: string | null;
  total: number;
  dueAtShop: number;
  staff: { name: string } | null;
  shop: { name: string };
  items: { id: string; name: string; price: number; options: { id: string; name: string }[] }[];
};

/**
 * Shown when shop staff scan a booking code. The button advances exactly one
 * step, taken from the shared status map — never straight to finished.
 */
export function StaffVerifyPanel({ booking }: { booking: VerifyBooking }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const step = nextStatus(booking.status, booking.fulfilment);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4">
      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
            <BadgeCheck size={18} /> {t("qr.verify")}
          </span>
          <StatusBadge status={booking.status} />
        </div>

        <div className="rounded-2xl border border-dashed p-4 text-center">
          <p className="text-2xl font-bold tracking-[0.2em]">{booking.code}</p>
          <p className="muted mt-1 text-sm">
            {booking.date} · {minToTime(booking.startMin, locale)}–{minToTime(booking.endMin, locale)}
          </p>
        </div>

        <div className="space-y-1 text-sm">
          <Row label={t("book.yourName")} value={booking.customerName} />
          <Row label={t("book.yourPhone")} value={booking.customerPhone} />
          {booking.recipientName ? <Row label={t("book.forOther")} value={booking.recipientName} /> : null}
          <Row label={t("dash.staff")} value={booking.staff?.name ?? t("book.anyStaff")} />
        </div>

        <ul className="space-y-1 border-t pt-3 text-sm">
          {booking.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.name}
                {i.options.length > 0 ? (
                  <span className="muted"> · {i.options.map((o) => o.name).join(", ")}</span>
                ) : null}
              </span>
              <span>{formatTaka(i.price, locale)}</span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between border-t pt-3 font-semibold">
          <span>{t("book.dueAtShop")}</span>
          <span>{formatTaka(booking.dueAtShop, locale)}</span>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {step ? (
          <Button
            size="lg"
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError("");
                const res = await fetch(`/api/bookings/${booking.id}/advance`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ to: step.next }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  setError(data.error === "NOT_FOUND" ? t("common.error") : t("common.error"));
                  return;
                }
                router.refresh();
              })
            }
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : null}
            {t(step.labelKey)}
          </Button>
        ) : (
          <p className="muted text-center text-sm">{t("qr.verified")}</p>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
