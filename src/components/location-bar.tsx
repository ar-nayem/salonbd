"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Loader2, X } from "lucide-react";
import { Button, Card } from "./ui";
import { useI18n } from "./locale-provider";

type State = "idle" | "locating" | "granted" | "denied" | "unavailable";

const CACHE_KEY = "sb_fix";
const CACHE_MS = 10 * 60 * 1000;

/**
 * "Where I am" and "where I am browsing" are separate. The fix is cached for a
 * few minutes so every navigation does not re-prompt, and the app stays fully
 * usable when permission is denied.
 */
export function LocationBar({ areaLabel }: { areaLabel?: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>("idle");

  const hasCoords = params.get("lat") && params.get("lng");

  useEffect(() => {
    if (hasCoords) {
      setState("granted");
      return;
    }
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const fix = JSON.parse(raw) as { lat: number; lng: number; at: number };
      if (Date.now() - fix.at < CACHE_MS) setState("granted");
    } catch {
      // A blocked storage API is not a reason to break the page.
    }
  }, [hasCoords]);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("unavailable");
      return;
    }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fix = {
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
          at: Date.now(),
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fix));
        } catch {
          // ignore
        }
        setState("granted");
        const next = new URLSearchParams(params.toString());
        next.set("lat", String(fix.lat));
        next.set("lng", String(fix.lng));
        next.set("sort", "near");
        router.push(`/shops?${next}`);
      },
      () => setState("denied"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: CACHE_MS },
    );
  }

  function clear() {
    const next = new URLSearchParams(params.toString());
    next.delete("lat");
    next.delete("lng");
    if (next.get("sort") === "near") next.delete("sort");
    router.push(`/shops?${next}`);
  }

  return (
    <Card className="flex flex-wrap items-center gap-2 p-3 text-sm">
      <MapPin size={16} className="text-brand-600" />
      <span className="muted">{t("loc.browsing")}:</span>
      <span className="font-medium">{areaLabel || t("common.all")}</span>

      <div className="ml-auto flex items-center gap-2">
        {hasCoords ? (
          <Button size="sm" variant="ghost" onClick={clear}>
            <X size={14} /> {t("loc.change")}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={locate} disabled={state === "locating"}>
            {state === "locating" ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            {state === "locating" ? t("loc.locating") : t("loc.use")}
          </Button>
        )}
      </div>

      {state === "denied" ? <p className="muted w-full text-xs">{t("loc.denied")}</p> : null}
      {state === "unavailable" ? <p className="muted w-full text-xs">{t("loc.unavailable")}</p> : null}
      {hasCoords ? (
        // No geocoding provider is configured, so the place name is not invented.
        <p className="muted w-full text-xs">{t("loc.unknownPlace")}</p>
      ) : null}
    </Card>
  );
}
