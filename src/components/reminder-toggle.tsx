"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button, Card } from "./ui";
import { useI18n } from "./locale-provider";

type State =
  | "checking"
  | "unsupported"
  | "ios-install"
  | "unavailable"
  | "denied"
  | "off"
  | "working"
  | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Turns on reminders delivered by the server. Unlike calendar alarms, these do
 * not depend on which calendar app someone uses.
 */
export function ReminderToggle({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>("checking");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iOS only exposes Web Push to sites added to the home screen.
        setState(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      const key = await fetch("/api/push/public-key").then((r) => r.json()).catch(() => null);
      if (!key?.enabled) {
        setState("unavailable");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    })();
  }, []);

  async function turnOn() {
    setNote("");
    setState("working");
    try {
      const key = await fetch("/api/push/public-key").then((r) => r.json());
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key.publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await subscription.unsubscribe();
        setNote(t("common.error"));
        setState("off");
        return;
      }
      // The server sends a test notification; say so plainly if it did not land.
      if (!data.delivered) setNote(t("rem.notDelivered"));
      setState("on");
    } catch (err) {
      console.error("[reminders] subscribe failed", err);
      setNote(t("common.error"));
      setState("off");
    }
  }

  async function turnOff() {
    setState("working");
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    setState("off");
  }

  const message =
    state === "ios-install"
      ? t("rem.iosInstall")
      : state === "unsupported"
        ? t("rem.unsupported")
        : state === "denied"
          ? t("rem.denied")
          : state === "unavailable"
            ? t("rem.unavailable")
            : state === "on"
              ? t("rem.on")
              : t("rem.body");

  return (
    <Card className={compact ? "space-y-2 p-3" : "space-y-3 p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold">
            {state === "on" ? <Bell size={16} className="text-brand-600" /> : <BellOff size={16} />}
            {t("rem.title")}
          </p>
          <p className="muted mt-1 text-sm">{message}</p>
        </div>

        {state === "off" ? (
          <Button size="sm" onClick={turnOn}>
            {t("rem.turnOn")}
          </Button>
        ) : state === "on" ? (
          <Button size="sm" variant="outline" onClick={turnOff}>
            {t("rem.turnOff")}
          </Button>
        ) : state === "working" || state === "checking" ? (
          <Loader2 size={18} className="muted animate-spin" />
        ) : null}
      </div>
      {note ? <p className="text-xs text-amber-700 dark:text-amber-300">{note}</p> : null}
    </Card>
  );
}
