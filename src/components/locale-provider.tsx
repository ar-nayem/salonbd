"use client";

import { createContext, useContext, useMemo } from "react";
import type { Dict, Locale } from "@/lib/dictionaries";

type Ctx = { locale: Locale; t: (key: string) => string };
const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  const value = useMemo<Ctx>(
    () => ({ locale, t: (key: string) => dict[key] ?? key }),
    [locale, dict],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) return { locale: "bn", t: (k) => k };
  return ctx;
}
