"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Button, Card, Input } from "./ui";
import { useI18n } from "./locale-provider";

export function QueuePanel({
  shopId,
  serving,
  waiting,
}: {
  shopId: string;
  serving: number | null;
  waiting: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function join() {
    setError("");
    start(async () => {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId, name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "INVALID_PHONE" ? "Enter a valid mobile number" : t("common.error"));
        return;
      }
      setToken(data.number);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Users size={16} /> {t("shop.queue")}
          </p>
          <p className="muted mt-1 text-sm">
            {t("shop.queueNow")}: <span className="font-semibold">{serving ?? "—"}</span> ·{" "}
            {waiting} {t("shop.queueWaiting")}
          </p>
        </div>
        {token === null ? (
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {t("shop.joinQueue")}
          </Button>
        ) : (
          <span className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">
            #{token}
          </span>
        )}
      </div>

      {open ? (
        <div className="mt-3 space-y-2">
          <Input placeholder={t("book.yourName")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            placeholder={t("book.yourPhone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" onClick={join} disabled={pending || name.trim().length < 2}>
            {pending ? t("common.saving") : t("shop.joinQueue")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
