"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { Button, Card, Textarea } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";

export function CancelBooking({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => {
          if (!confirm(t("bookings.cancelConfirm"))) return;
          start(async () => {
            const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
            if (!res.ok) {
              const data = await res.json();
              setError(data.error === "TOO_LATE" ? "This booking can no longer be cancelled." : t("common.error"));
              return;
            }
            router.refresh();
          });
        }}
        disabled={pending}
        className="text-red-600"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("bookings.cancel")}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function PayNow({ bookingId, label }: { bookingId: string; label: string }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <div>
      <Button
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/payments/init", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId }),
            });
            const data = await res.json();
            if (res.ok && data.redirectUrl) {
              window.location.href = data.redirectUrl;
              return;
            }
            setError(data.detail || t("common.error"));
          })
        }
        disabled={pending}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {label}
      </Button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <Card className="space-y-3 p-4">
      <p className="font-medium">{t("bookings.review")}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i} star`}>
            <Star
              size={26}
              className={cn(i <= rating ? "fill-gold-500 text-gold-500" : "text-ink-300")}
            />
          </button>
        ))}
      </div>
      <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/reviews", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ bookingId, rating, comment: comment || undefined }),
            });
            if (!res.ok) {
              setError(t("common.error"));
              return;
            }
            router.refresh();
          })
        }
        disabled={pending}
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("common.save")}
      </Button>
    </Card>
  );
}
