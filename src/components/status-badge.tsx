"use client";

import { Badge } from "./ui";
import { useI18n } from "./locale-provider";

const TONES = {
  PENDING: "amber",
  CONFIRMED: "green",
  COMPLETED: "blue",
  CANCELLED: "red",
  NO_SHOW: "neutral",
} as const;

export function StatusBadge({ status }: { status: keyof typeof TONES }) {
  const { t } = useI18n();
  return <Badge tone={TONES[status]}>{t(`status.${status}`)}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const tone =
    status === "PAID" ? "green" : status === "FAILED" ? "red" : status === "DEPOSIT_PAID" ? "blue" : "neutral";
  return <Badge tone={tone as "green" | "red" | "blue" | "neutral"}>{t(`pay.${status}`)}</Badge>;
}
