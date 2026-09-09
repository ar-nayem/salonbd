"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import type { BookingStatus, Fulfilment } from "@prisma/client";
import { FLOW } from "@/lib/status";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";

type Event = { status: BookingStatus; createdAt: string };

export function BookingTimeline({
  bookingId,
  status,
  fulfilment,
  events,
}: {
  bookingId: string;
  status: BookingStatus;
  fulfilment: Fulfilment;
  events: Event[];
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [live, setLive] = useState({ status, events });

  // No realtime transport exists, so the page polls while it is visible.
  useEffect(() => {
    if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(live.status)) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch(`/api/bookings/${bookingId}/status`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status !== live.status) {
        setLive({ status: data.status, events: data.events });
        router.refresh();
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [bookingId, live.status, router]);

  if (live.status === "CANCELLED" || live.status === "NO_SHOW") {
    return (
      <div className="rounded-2xl border border-dashed p-4 text-sm">
        {t(`status.${live.status}`)}
      </div>
    );
  }

  const flow = FLOW[fulfilment];
  const reachedIndex = flow.indexOf(live.status);

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{t("track.timeline")}</p>
      <ol className="space-y-3">
        {flow.map((step, i) => {
          const event = live.events.find((e) => e.status === step);
          const done = i <= reachedIndex;
          return (
            <li key={step} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  done ? "border-brand-600 bg-brand-600 text-white" : "muted",
                )}
              >
                {done ? <Check size={13} /> : <Circle size={8} />}
              </span>
              <div className="min-w-0">
                <p className={cn("text-sm", done ? "font-medium" : "muted")}>
                  {t(`status.${step}`)}
                </p>
                {event ? (
                  <p className="muted text-xs">
                    {new Date(event.createdAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="muted mt-3 text-xs">{t("track.liveNote")}</p>
    </div>
  );
}
