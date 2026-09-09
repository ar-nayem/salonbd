"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Clock, Loader2, Users, Wallet, CreditCard, Tag } from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "./ui";
import { useI18n } from "./locale-provider";
import { addDaysISO, cn, formatDateLabel, formatNumber, formatTaka, initials, minToTime, todayISO } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  nameBn: string | null;
  price: number;
  durationMin: number;
  category: string;
};
type Staff = { id: string; name: string; title: string | null; avatarUrl: string | null; ratingAvg: number };

type Props = {
  shop: {
    id: string;
    slug: string;
    name: string;
    acceptsCash: boolean;
    acceptsOnline: boolean;
    depositPercent: number;
  };
  services: Service[];
  staff: Staff[];
  user: { name: string; phone: string | null } | null;
  preselectedServiceId?: string;
};

type Slot = { startMin: number; staffIds: (string | null)[] };

export function BookingFlow({ shop, services, staff, user, preselectedServiceId }: Props) {
  const { locale, t } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState(preselectedServiceId ? 1 : 0);
  const [selected, setSelected] = useState<string[]>(
    preselectedServiceId ? [preselectedServiceId] : [],
  );
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [method, setMethod] = useState<"CASH" | "ONLINE">(shop.acceptsCash ? "CASH" : "ONLINE");
  const [error, setError] = useState("");
  const [submitting, startSubmit] = useTransition();

  const chosen = useMemo(
    () => services.filter((s) => selected.includes(s.id)),
    [services, selected],
  );
  const durationMin = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const subtotal = chosen.reduce((sum, s) => sum + s.price, 0);
  const discount = promo?.discount ?? 0;
  const total = Math.max(subtotal - discount, 0);
  const payNow =
    method === "ONLINE"
      ? shop.depositPercent > 0
        ? Math.max(Math.round((total * shop.depositPercent) / 100), 1)
        : total
      : 0;

  const dates = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDaysISO(todayISO(), i)),
    [],
  );

  useEffect(() => {
    if (step !== 2 || selected.length === 0) return;
    let cancelled = false;
    setLoadingSlots(true);
    setStartMin(null);
    const params = new URLSearchParams({ date, services: selected.join(",") });
    if (staffId) params.set("staff", staffId);
    fetch(`/api/shops/${shop.id}/slots?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, date, staffId, selected, shop.id]);

  function toggleService(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function applyPromo() {
    setPromoError("");
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput, shopId: shop.id, subtotal }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      setPromo(null);
      setPromoError(
        data.reason === "MIN_AMOUNT"
          ? `Minimum ${formatTaka(data.min ?? 0, locale)}`
          : data.reason === "EXPIRED"
            ? "Expired code"
            : data.reason === "LIMIT"
              ? "Usage limit reached"
              : "Invalid code",
      );
      return;
    }
    setPromo({ code: data.code, discount: data.discount });
  }

  function submit() {
    setError("");
    startSubmit(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          serviceIds: selected,
          staffId,
          date,
          startMin,
          customerName: name,
          customerPhone: phone,
          notes: notes || undefined,
          promoCode: promo?.code,
          paymentMethod: method,
        }),
      });
      const data = await res.json();

      if (res.status === 401) {
        router.push(`/login?next=/shops/${shop.slug}/book`);
        return;
      }
      if (!res.ok) {
        setError(
          data.error === "SLOT_TAKEN"
            ? "That slot was just taken. Pick another time."
            : data.error === "INVALID_PHONE"
              ? "Enter a valid Bangladeshi mobile number."
              : t("common.error"),
        );
        if (data.error === "SLOT_TAKEN") setStep(2);
        return;
      }

      if (method === "ONLINE") {
        const pay = await fetch("/api/payments/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: data.bookingId }),
        });
        const payData = await pay.json();
        if (pay.ok && payData.redirectUrl) {
          window.location.href = payData.redirectUrl;
          return;
        }
      }
      router.push(`/bookings/${data.bookingId}?new=1`);
      router.refresh();
    });
  }

  const steps = [t("book.step.services"), t("book.step.staff"), t("book.step.time"), t("book.step.confirm")];

  return (
    <div className="space-y-4 pb-32">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                i < step
                  ? "bg-brand-600 text-white"
                  : i === step
                    ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900"
                    : "bg-ink-100 text-ink-500 dark:bg-ink-800",
              )}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn("hidden text-xs sm:block", i === step ? "font-medium" : "muted")}>
              {label}
            </span>
            {i < steps.length - 1 ? <div className="h-px flex-1 bg-[var(--line)]" /> : null}
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="space-y-2">
          <p className="muted text-sm">{t("book.selectServices")}</p>
          {services.map((s) => {
            const on = selected.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={cn(
                  "card flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left transition",
                  on && "border-brand-500 ring-2 ring-brand-500/20",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {locale === "bn" && s.nameBn ? s.nameBn : s.name}
                  </p>
                  <p className="muted mt-0.5 flex items-center gap-1 text-xs">
                    <Clock size={12} /> {formatNumber(s.durationMin, locale)} {t("book.min")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatTaka(s.price, locale)}</span>
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full border",
                      on && "border-brand-600 bg-brand-600 text-white",
                    )}
                  >
                    {on ? <Check size={14} /> : null}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            onClick={() => setStaffId(null)}
            className={cn(
              "card flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition",
              staffId === null && "border-brand-500 ring-2 ring-brand-500/20",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 dark:bg-ink-800">
              <Users size={18} />
            </span>
            <span className="text-sm font-medium">{t("book.anyStaff")}</span>
          </button>
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => setStaffId(s.id)}
              className={cn(
                "card flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition",
                staffId === s.id && "border-brand-500 ring-2 ring-brand-500/20",
              )}
            >
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatarUrl} alt={s.name} className="h-full w-full object-cover" />
                ) : (
                  initials(s.name)
                )}
              </span>
              <span className="text-sm font-medium">{s.name}</span>
              {s.title ? <span className="muted text-xs">{s.title}</span> : null}
            </button>
          ))}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setDate(d)}
                className={cn(
                  "card min-w-[5.5rem] rounded-2xl px-3 py-2.5 text-center text-sm transition",
                  date === d && "border-brand-500 bg-brand-600 text-white",
                )}
              >
                {formatDateLabel(d, locale)}
              </button>
            ))}
          </div>

          {loadingSlots ? (
            <div className="muted flex items-center justify-center gap-2 py-10 text-sm">
              <Loader2 className="animate-spin" size={16} /> {t("common.loading")}
            </div>
          ) : slots.length === 0 ? (
            <p className="muted py-10 text-center text-sm">{t("book.noSlots")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((slot) => (
                <button
                  key={slot.startMin}
                  onClick={() => setStartMin(slot.startMin)}
                  className={cn(
                    "card rounded-xl py-2.5 text-sm transition",
                    startMin === slot.startMin && "border-brand-500 bg-brand-600 text-white",
                  )}
                >
                  {minToTime(slot.startMin, locale)}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <Card className="space-y-3 p-4">
            <div>
              <Label>{t("book.yourName")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t("book.yourPhone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <Label>{t("book.notes")}</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </Card>

          <Card className="space-y-2 p-4">
            <Label>{t("book.promo")}</Label>
            {promo ? (
              <div className="flex items-center justify-between rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950">
                <span className="flex items-center gap-2 font-medium">
                  <Tag size={14} /> {promo.code}
                </span>
                <button
                  className="text-xs text-red-600"
                  onClick={() => {
                    setPromo(null);
                    setPromoInput("");
                  }}
                >
                  {t("book.removePromo")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="SALON10"
                />
                <Button variant="outline" onClick={applyPromo} disabled={!promoInput.trim()}>
                  {t("book.applyPromo")}
                </Button>
              </div>
            )}
            {promoError ? <p className="text-xs text-red-600">{promoError}</p> : null}
          </Card>

          <Card className="space-y-2 p-4">
            <Label>{t("book.payment")}</Label>
            {shop.acceptsCash ? (
              <button
                onClick={() => setMethod("CASH")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm",
                  method === "CASH" && "border-brand-500 ring-2 ring-brand-500/20",
                )}
              >
                <Wallet size={18} /> {t("book.payCash")}
              </button>
            ) : null}
            {shop.acceptsOnline ? (
              <button
                onClick={() => setMethod("ONLINE")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm",
                  method === "ONLINE" && "border-brand-500 ring-2 ring-brand-500/20",
                )}
              >
                <CreditCard size={18} /> {t("book.payOnline")}
              </button>
            ) : null}
          </Card>

          <Card className="space-y-1.5 p-4 text-sm">
            <Row label={t("book.subtotal")} value={formatTaka(subtotal, locale)} />
            {discount > 0 ? (
              <Row label={t("book.discount")} value={`− ${formatTaka(discount, locale)}`} />
            ) : null}
            <Row label={t("book.duration")} value={`${formatNumber(durationMin, locale)} ${t("book.min")}`} />
            <div className="my-1 border-t" />
            <Row label={t("book.total")} value={formatTaka(total, locale)} strong />
            {method === "ONLINE" ? (
              <>
                <Row label={t("book.deposit")} value={formatTaka(payNow, locale)} />
                <Row label={t("book.dueAtShop")} value={formatTaka(total - payNow, locale)} />
              </>
            ) : null}
          </Card>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--card)] p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} size="lg">
              <ChevronLeft size={16} /> {t("book.back")}
            </Button>
          ) : null}

          <div className="ml-auto flex items-center gap-3">
            {selected.length > 0 ? (
              <div className="text-right">
                <p className="muted text-xs">
                  {formatNumber(chosen.length, locale)} · {formatNumber(durationMin, locale)} {t("book.min")}
                </p>
                <p className="font-semibold">{formatTaka(total, locale)}</p>
              </div>
            ) : null}

            {step < 3 ? (
              <Button
                size="lg"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && selected.length === 0) || (step === 2 && startMin === null)}
              >
                {t("book.next")}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={submit}
                disabled={submitting || name.trim().length < 2 || phone.trim().length < 6}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : null}
                {t("book.confirm")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-semibold" : "muted"}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
