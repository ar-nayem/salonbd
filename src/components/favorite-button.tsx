"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "./locale-provider";

export function FavoriteButton({
  shopId,
  initial,
  loggedIn,
}: {
  shopId: string;
  initial: boolean;
  loggedIn: boolean;
}) {
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <button
      onClick={() => {
        if (!loggedIn) {
          router.push(`/login?next=/shops`);
          return;
        }
        const next = !saved;
        setSaved(next);
        start(async () => {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shopId, saved: next }),
          });
          router.refresh();
        });
      }}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition",
        saved ? "border-red-200 bg-red-50 text-red-600 dark:bg-red-950/40" : "hover:bg-black/[.03]",
      )}
    >
      <Heart size={16} className={saved ? "fill-red-500 text-red-500" : ""} />
      {saved ? t("shop.saved") : t("shop.save")}
    </button>
  );
}
