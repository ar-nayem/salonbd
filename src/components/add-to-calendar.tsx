"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Download } from "lucide-react";
import { Card } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

/**
 * A website cannot write to the phone's calendar by itself — the platform
 * requires one tap. This puts the right tap first for the device in hand.
 */
export function AddToCalendar({
  icsUrl,
  googleUrl,
  highlight,
}: {
  icsUrl: string;
  googleUrl: string;
  highlight?: boolean;
}) {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => setPlatform(detectPlatform()), []);

  const apple = (
    <a
      key="apple"
      href={icsUrl}
      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink-900 px-4 text-sm font-medium text-white dark:bg-white dark:text-ink-900"
    >
      <CalendarPlus size={16} /> {t("cal.apple")}
    </a>
  );
  const google = (
    <a
      key="google"
      href={googleUrl}
      target="_blank"
      rel="noreferrer"
      className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium"
    >
      <CalendarPlus size={16} /> {t("cal.google")}
    </a>
  );
  const other = (
    <a
      key="other"
      href={icsUrl}
      download
      className="flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm"
    >
      <Download size={16} /> {t("cal.other")}
    </a>
  );

  const ordered =
    platform === "ios" ? [apple, google, other] : platform === "android" ? [google, other, apple] : [google, apple, other];

  return (
    <Card className={cn("space-y-3 p-4", highlight && "border-brand-500 ring-2 ring-brand-500/20")}>
      <p className="font-semibold">{t("cal.title")}</p>
      <div className="grid gap-2 sm:grid-cols-3">{ordered}</div>
      <p className="muted text-xs">{t("cal.alarmsNote")}</p>
    </Card>
  );
}
