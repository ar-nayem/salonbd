"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronDown,
  Clock,
  Loader2,
  Users,
  Wallet,
  CreditCard,
  Tag,
  Armchair,
  UserPlus,
} from "lucide-react";
import { Button, Card, Input, Label, Textarea } from "./ui";
import { useI18n } from "./locale-provider";
import {
  addDaysISO,
  cn,
  formatDateLabel,
  formatNumber,
  formatTaka,
  initials,
  minToTime,
  todayISO,
} from "@/lib/utils";

type Option = { id: string; name: string; nameBn: string | null; priceDelta: number; durationDelta: number };
type OptionGroup = { id: string; name: string; nameBn: string | null; required: boolean; maxSelect: number; options: Option[] };
type Addon = { id: string; name: string; nameBn: string | null; price: number; durationMin: number };

type Service = {
  id: string;
  name: string;
  nameBn: string | null;
  price: number;
  discountPrice: number | null;
  durationMin: number;
  category: string;
  optionGroups: OptionGroup[];
  addons: Addon[];
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
  user: { name: string; phone: string | null; isGuest: boolean } | null;
  preselectedServiceId?: string;
  qrToken?: string;
  stationName?: string | null;
};

type Slot = { startMin: number; staffIds: (string | null)[] };
type Selection = { serviceId: string; optionIds: string[]; addonIds: string[] };

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BookingFlow({
  shop,
  services,
  staff,
  user,
  preselectedServiceId,
  qrToken,
  stationName,
}: Props) {
  const { locale, t } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState(preselectedServiceId ? 1 : 0);
  const [selection, setSelection] = useState<Selection[]>(
    preselectedServiceId ? [{ serviceId: preselectedServiceId, optionIds: [], addonIds: [] }] : [],
  );
  const [expanded, setExpanded] = useState<string | null>(preselectedServiceId ?? null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [startMin, setStartMin] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [bookingFor, setBookingFor] = useState<"SELF" | "OTHER">("SELF");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientNote, setRecipientNote] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [method, setMethod] = useState<"CASH" | "ONLINE">(shop.acceptsCash ? "CASH" : "ONLINE");
  const [error, setError] = useState("");
  const [needsIdentity, setNeedsIdentity] = useState(false);
  const [submitting, startSubmit] = useTransition();

  // Minted once, when the flow reaches the payment step, and reused across
  // every retry so a double submit cannot create a second booking.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  useEffect(() => {
    if (step === 3 && !idempotencyKey) setIdempotencyKey(newIdempotencyKey());
  }, [step, idempotencyKey]);

  const priced = useMemo(() => {
    let subtotal = 0;
    let durationMin = 0;
    const detail: { service: Service; parts: { name: string; price: number }[]; price: number }[] = [];

    for (const line of selection) {
      const service = services.find((s) => s.id === line.serviceId);
      if (!service) continue;
      const base =
        service.discountPrice !== null && service.discountPrice < service.price
          ? service.discountPrice
          : service.price;

      const parts: { name: string; price: number }[] = [];
      let price = base;
      let duration = service.durationMin;

      for (const group of service.optionGroups) {
        for (const option of group.options) {
          if (!line.optionIds.includes(option.id)) continue;
          price += option.priceDelta;
          duration += option.durationDelta;
          parts.push({
            name: locale === "bn" && option.nameBn ? option.nameBn : option.name,
            price: option.priceDelta,
          });
        }
      }
      for (const addon of service.addons) {
        if (!line.addonIds.includes(addon.id)) continue;
        price += addon.price;
        duration += addon.durationMin;
        parts.push({
          name: locale === "bn" && addon.nameBn ? addon.nameBn : addon.name,
          price: addon.price,
        });
      }

      subtotal += price;
      durationMin += duration;
      detail.push({ service, parts, price });
    }
    return { subtotal, durationMin, detail };
  }, [selection, services, locale]);

  const discount = promo?.discount ?? 0;
  const total = Math.max(priced.subtotal - discount, 0);
  const payNow =
    method === "ONLINE"
      ? shop.depositPercent > 0
        ? Math.max(Math.round((total * shop.depositPercent) / 100), 1)
        : total
      : 0;

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysISO(todayISO(), i)), []);

  const linesParam = useMemo(
    () =>
      typeof window === "undefined"
        ? ""
        : btoa(JSON.stringify(selection)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
    [selection],
  );

  useEffect(() => {
    if (step !== 2 || selection.length === 0) return;
    let cancelled = false;
    setLoadingSlots(true);
    setStartMin(null);
    const params = new URLSearchParams({ date, lines: linesParam });
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
  }, [step, date, staffId, selection, linesParam, shop.id]);

  function toggleService(id: string) {
    setSelection((prev) =>
      prev.some((l) => l.serviceId === id)
        ? prev.filter((l) => l.serviceId !== id)
        : [...prev, { serviceId: id, optionIds: [], addonIds: [] }],
    );
    setExpanded(id);
  }

  function toggleOption(serviceId: string, group: OptionGroup, optionId: string) {
    setSelection((prev) =>
      prev.map((line) => {
        if (line.serviceId !== serviceId) return line;
        const groupIds = group.options.map((o) => o.id);
        const current = line.optionIds.filter((id) => groupIds.includes(id));
        const others = line.optionIds.filter((id) => !groupIds.includes(id));
        let next: string[];
        if (current.includes(optionId)) next = current.filter((id) => id !== optionId);
        else if (group.maxSelect <= 1) next = [optionId];
        else next = [...current, optionId].slice(-group.maxSelect);
        return { ...line, optionIds: [...others, ...next] };
      }),
    );
  }

  function toggleAddon(serviceId: string, addonId: string) {
    setSelection((prev) =>
      prev.map((line) =>
        line.serviceId === serviceId
          ? {
              ...line,
              addonIds: line.addonIds.includes(addonId)
                ? line.addonIds.filter((id) => id !== addonId)
                : [...line.addonIds, addonId],
            }
          : line,
      ),
    );
  }

  async function applyPromo() {
    setPromoError("");
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput, shopId: shop.id, subtotal: priced.subtotal }),
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

  function submit(asGuest = false) {
    setError("");
    startSubmit(async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: shop.id,
          lines: selection,
          staffId,
          date,
          startMin,
          customerName: name,
          customerPhone: phone,
          notes: notes || undefined,
          promoCode: promo?.code,
          paymentMethod: method,
          bookingFor,
          recipientName: bookingFor === "OTHER" ? recipientName : undefined,
          recipientPhone: bookingFor === "OTHER" ? recipientPhone : undefined,
          recipientNote: bookingFor === "OTHER" ? recipientNote : undefined,
          qrToken,
          idempotencyKey,
          guest: asGuest || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setNeedsIdentity(true);
        return;
      }
      if (!res.ok) {
        setError(
          data.error === "SLOT_TAKEN"
            ? "That slot was just taken. Pick another time."
            : data.error === "INVALID_PHONE"
              ? "Enter a valid Bangladeshi mobile number."
              : data.error === "ACCOUNT_EXISTS"
                ? "This number already has an account. Log in to continue."
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
        // A failed payment start leaves the booking unconfirmed and says so.
        router.push(`/bookings/${data.bookingId}?payment=failed`);
        return;
      }
      router.push(`/bookings/${data.bookingId}?new=1`);
      router.refresh();
    });
  }

  const steps = [t("book.step.services"), t("book.step.staff"), t("book.step.time"), t("book.step.confirm")];

  return (
    <div className="space-y-4 pb-36">
      {stationName ? (
        <Card className="flex items-center gap-2 p-3 text-sm">
          <Armchair size={16} className="text-brand-600" />
          <span className="muted">{t("book.chairFromQr")}</span>
          <span className="font-medium">{stationName}</span>
        </Card>
      ) : null}

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
            const line = selection.find((l) => l.serviceId === s.id);
            const on = Boolean(line);
            const hasExtras = s.optionGroups.length > 0 || s.addons.length > 0;
            const open = expanded === s.id && on && hasExtras;
            const discounted = s.discountPrice !== null && s.discountPrice < s.price;

            return (
              <Card key={s.id} className={cn("overflow-hidden", on && "border-brand-500 ring-2 ring-brand-500/20")}>
                <button onClick={() => toggleService(s.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {locale === "bn" && s.nameBn ? s.nameBn : s.name}
                    </p>
                    <p className="muted mt-0.5 flex items-center gap-1 text-xs">
                      <Clock size={12} /> {formatNumber(s.durationMin, locale)} {t("book.min")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-right">
                      {discounted ? (
                        <span className="muted mr-1 text-xs line-through">
                          {formatTaka(s.price, locale)}
                        </span>
                      ) : null}
                      <span className="font-semibold">
                        {formatTaka(discounted ? s.discountPrice! : s.price, locale)}
                      </span>
                    </span>
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

                {on && hasExtras ? (
                  <div className="border-t">
                    <button
                      onClick={() => setExpanded(open ? null : s.id)}
                      className="muted flex w-full items-center justify-between px-4 py-2 text-xs"
                    >
                      {t("book.options")}
                      <ChevronDown size={14} className={cn("transition", open && "rotate-180")} />
                    </button>

                    {open ? (
                      <div className="space-y-3 px-4 pb-4">
                        {s.optionGroups.map((group) => (
                          <div key={group.id}>
                            <p className="mb-1.5 text-xs font-semibold">
                              {locale === "bn" && group.nameBn ? group.nameBn : group.name}
                              {group.required ? <span className="text-red-600"> *</span> : null}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {group.options.map((o) => {
                                const active = line?.optionIds.includes(o.id) ?? false;
                                return (
                                  <button
                                    key={o.id}
                                    onClick={() => toggleOption(s.id, group, o.id)}
                                    className={cn(
                                      "rounded-xl border px-3 py-1.5 text-xs",
                                      active && "border-brand-500 bg-brand-50 dark:bg-brand-950",
                                    )}
                                  >
                                    {locale === "bn" && o.nameBn ? o.nameBn : o.name}
                                    {o.priceDelta ? ` +${formatTaka(o.priceDelta, locale)}` : ""}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {s.addons.length > 0 ? (
                          <div>
                            <p className="mb-1.5 text-xs font-semibold">{t("book.addons")}</p>
                            <div className="flex flex-wrap gap-2">
                              {s.addons.map((a) => {
                                const active = line?.addonIds.includes(a.id) ?? false;
                                return (
                                  <button
                                    key={a.id}
                                    onClick={() => toggleAddon(s.id, a.id)}
                                    className={cn(
                                      "rounded-xl border px-3 py-1.5 text-xs",
                                      active && "border-brand-500 bg-brand-50 dark:bg-brand-950",
                                    )}
                                  >
                                    {locale === "bn" && a.nameBn ? a.nameBn : a.name} +
                                    {formatTaka(a.price, locale)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
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

          <Card className="space-y-3 p-4">
            <Label>{t("book.forWho")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["SELF", "OTHER"] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setBookingFor(value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    bookingFor === value && "border-brand-500 ring-2 ring-brand-500/20",
                  )}
                >
                  {value === "SELF" ? t("book.forMe") : t("book.forOther")}
                </button>
              ))}
            </div>
            {bookingFor === "OTHER" ? (
              <div className="space-y-2">
                <Input
                  placeholder={t("book.recipientName")}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <Input
                  placeholder={t("book.recipientPhone")}
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  inputMode="numeric"
                />
                <Input
                  placeholder={t("book.recipientNote")}
                  value={recipientNote}
                  onChange={(e) => setRecipientNote(e.target.value)}
                />
              </div>
            ) : null}
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
                  placeholder="SALONBD10"
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
            {priced.detail.map((line) => (
              <div key={line.service.id} className="flex justify-between">
                <span className="min-w-0">
                  {locale === "bn" && line.service.nameBn ? line.service.nameBn : line.service.name}
                  {line.parts.length > 0 ? (
                    <span className="muted"> · {line.parts.map((p) => p.name).join(", ")}</span>
                  ) : null}
                </span>
                <span>{formatTaka(line.price, locale)}</span>
              </div>
            ))}
            {discount > 0 ? (
              <Row label={t("book.discount")} value={`− ${formatTaka(discount, locale)}`} />
            ) : null}
            <Row
              label={t("book.duration")}
              value={`${formatNumber(priced.durationMin, locale)} ${t("book.min")}`}
            />
            <div className="my-1 border-t" />
            <Row label={t("book.total")} value={formatTaka(total, locale)} strong />
            {method === "ONLINE" ? (
              <>
                <Row label={t("book.deposit")} value={formatTaka(payNow, locale)} />
                <Row label={t("book.dueAtShop")} value={formatTaka(total - payNow, locale)} />
              </>
            ) : null}
          </Card>

          {needsIdentity ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-medium">{t("guest.notice")}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => submit(true)} disabled={submitting}>
                  <UserPlus size={16} /> {t("guest.continue")}
                </Button>
                <Link
                  href={`/login?next=/shops/${shop.slug}/book`}
                  className="inline-flex h-11 items-center rounded-xl border px-4 text-sm"
                >
                  {t("nav.login")}
                </Link>
              </div>
            </Card>
          ) : null}

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
            {selection.length > 0 ? (
              <div className="text-right">
                <p className="muted text-xs">
                  {formatNumber(selection.length, locale)} ·{" "}
                  {formatNumber(priced.durationMin, locale)} {t("book.min")}
                </p>
                <p className="font-semibold">{formatTaka(total, locale)}</p>
              </div>
            ) : null}

            {step < 3 ? (
              <Button
                size="lg"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 0 && selection.length === 0) || (step === 2 && startMin === null)}
              >
                {t("book.next")}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => submit(false)}
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
