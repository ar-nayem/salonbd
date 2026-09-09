"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { useI18n } from "./locale-provider";

export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [q, setQ] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/shops?q=${encodeURIComponent(q.trim())}` : "/shops");
      }}
      className="flex w-full items-center gap-2 rounded-2xl border bg-[var(--card)] p-1.5 shadow-sm"
    >
      <span className="muted pl-2">
        <Search size={18} />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("home.searchPlaceholder")}
        className="h-10 flex-1 bg-transparent text-sm outline-none"
      />
      <button
        type="submit"
        className="h-10 rounded-xl bg-brand-600 px-4 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        {t("common.search")}
      </button>
    </form>
  );
}
