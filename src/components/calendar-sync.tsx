"use client";

import { useState, useTransition } from "react";
import { CalendarSync, Copy, Loader2, RotateCcw } from "lucide-react";
import { Button, Card } from "./ui";
import { useI18n } from "./locale-provider";

type Links = { https: string; webcal: string; google: string };

export function CalendarSyncCard() {
  const { t } = useI18n();
  const [links, setLinks] = useState<Links | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function load(rotate = false) {
    start(async () => {
      const res = await fetch("/api/calendar/token", { method: rotate ? "POST" : "GET" });
      if (res.ok) setLinks(await res.json());
    });
  }

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="flex items-center gap-2 font-semibold">
          <CalendarSync size={16} /> {t("cal.syncTitle")}
        </p>
        <p className="muted mt-1 text-sm">{t("cal.syncBody")}</p>
      </div>

      {!links ? (
        <Button size="sm" variant="outline" onClick={() => load()} disabled={pending}>
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}
          {t("cal.setup")}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={links.webcal}
              className="flex h-11 items-center justify-center rounded-xl bg-ink-900 px-4 text-sm font-medium text-white dark:bg-white dark:text-ink-900"
            >
              {t("cal.syncApple")}
            </a>
            <a
              href={links.google}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium"
            >
              {t("cal.syncGoogle")}
            </a>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(links.https);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy size={14} /> {copied ? t("cal.copied") : t("cal.copy")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (confirm(t("cal.resetConfirm"))) load(true);
              }}
            >
              <RotateCcw size={14} /> {t("cal.reset")}
            </Button>
          </div>
          <p className="muted text-xs">{t("cal.googleLag")}</p>
        </div>
      )}
    </Card>
  );
}
