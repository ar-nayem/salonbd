"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Server-rendered operations screens refresh themselves on an interval.
 * There is no realtime transport in this app yet — this is a poll, not a
 * simulation of one.
 */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
