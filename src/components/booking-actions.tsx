"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, ThumbsUp, X } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";
import { REVIEW_TAGS } from "@/lib/constants";

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
              const data = await res.json().catch(() => ({}));
              setError(
                data.error === "TOO_LATE" || data.error === "NOT_CANCELLABLE"
                  ? "This booking can no longer be cancelled."
                  : t("common.error"),
              );
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

type ReviewItem = { id: string; name: string };

export function ReviewForm({
  bookingId,
  items,
  staffName,
}: {
  bookingId: string;
  items: ReviewItem[];
  staffName?: string | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [staffRating, setStaffRating] = useState(5);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    setError("");
    start(async () => {
      const uploaded: string[] = [];
      for (const photo of photos) {
        const form = new FormData();
        form.append("file", photo.file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error === "TOO_LARGE" ? "Photo is too large (max 5 MB)." : t("common.error"));
          return;
        }
        uploaded.push(data.url);
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating,
          staffRating: staffName ? staffRating : undefined,
          comment: comment || undefined,
          tags,
          photos: uploaded,
          items: Object.entries(itemRatings).map(([bookingItemId, value]) => ({
            bookingItemId,
            rating: value,
          })),
        }),
      });
      if (!res.ok) {
        setError(t("common.error"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className="space-y-4 p-4">
      <p className="font-medium">{t("bookings.review")}</p>

      <div>
        <Label>{t("review.shopRating")}</Label>
        <Stars value={rating} onChange={setRating} />
      </div>

      {staffName ? (
        <div>
          <Label>
            {t("review.staffRating")} · {staffName}
          </Label>
          <Stars value={staffRating} onChange={setStaffRating} />
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="space-y-2">
          <Label>{t("review.serviceRating")}</Label>
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm">{item.name}</span>
              <Stars
                size={18}
                value={itemRatings[item.id] ?? 0}
                onChange={(value) => setItemRatings((prev) => ({ ...prev, [item.id]: value }))}
              />
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <Label>{t("review.tags")}</Label>
        <div className="flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() =>
                setTags((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]))
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                tags.includes(tag) && "border-brand-500 bg-brand-50 dark:bg-brand-950",
              )}
            >
              {t(`tag.${tag}`)}
            </button>
          ))}
        </div>
      </div>

      <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />

      <div>
        <Label>{t("review.photos")}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((photo, i) => (
            <div key={photo.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(photo.url);
                  setPhotos((prev) => prev.filter((_, index) => index !== i));
                }}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border border-dashed">
            <ImagePlus size={18} className="muted" />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, 6 - photos.length);
                setPhotos((prev) => [
                  ...prev,
                  ...files.map((file) => ({ file, url: URL.createObjectURL(file) })),
                ]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <Button onClick={submit} disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("common.save")}
      </Button>
    </Card>
  );
}

export function HelpfulButton({
  reviewId,
  initialCount,
  initialVoted,
}: {
  reviewId: string;
  initialCount: number;
  initialVoted: boolean;
}) {
  const { t } = useI18n();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(initialVoted);
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
          if (!res.ok) return;
          const data = await res.json();
          setVoted(data.voted);
          setCount(data.count);
        })
      }
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
        voted && "border-brand-500 text-brand-700 dark:text-brand-300",
      )}
    >
      <ThumbsUp size={12} /> {t("review.helpful")} {count > 0 ? count : ""}
    </button>
  );
}

/** Lets a guest keep the booking by setting a password after the fact. */
export function ClaimAccount() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (done) return <Card className="p-4 text-sm">{t("guest.claimed")}</Card>;

  return (
    <Card className="space-y-3 p-4">
      <p className="font-medium">{t("guest.claim")}</p>
      <Input
        type="email"
        placeholder={t("auth.emailOptional")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder={t("auth.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={6}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <Button
        disabled={pending || password.length < 6}
        onClick={() =>
          start(async () => {
            const res = await fetch("/api/auth/claim", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ password, email: email || undefined }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setError(data.error === "EMAIL_TAKEN" ? "That email is already used." : t("common.error"));
              return;
            }
            setDone(true);
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("common.save")}
      </Button>
    </Card>
  );
}

function Stars({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} onClick={() => onChange(i)} aria-label={`${i} star`}>
          <Star size={size} className={cn(i <= value ? "fill-gold-500 text-gold-500" : "text-ink-300")} />
        </button>
      ))}
    </div>
  );
}
