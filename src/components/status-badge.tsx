"use client";

import type { BookingStatus } from "@prisma/client";
import { Badge } from "./ui";
import { useI18n } from "./locale-provider";

const TONES: Record<BookingStatus, "neutral" | "green" | "amber" | "red" | "blue"> = {
  PENDING: "amber",
  CONFIRMED: "green",
  ACCEPTED: "blue",
  IN_PROGRESS: "blue",
  READY: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
  NO_SHOW: "neutral",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useI18n();
  return <Badge tone={TONES[status]}>{t(`status.${status}`)}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const tone =
    status === "PAID" ? "green" : status === "FAILED" ? "red" : status === "DEPOSIT_PAID" ? "blue" : "neutral";
  return <Badge tone={tone as "green" | "red" | "blue" | "neutral"}>{t(`pay.${status}`)}</Badge>;
}
