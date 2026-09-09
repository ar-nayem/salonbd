"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine } from "lucide-react";
import { useI18n } from "./locale-provider";

/**
 * Scanning is the most frequent action on the floor, so it is one tap from
 * every shop screen. It sits ~88px above the viewport bottom: a button pinned
 * closer than that can end up behind a mobile browser's own toolbar, and
 * env(safe-area-inset-bottom) only covers the iOS home indicator.
 */
export function ScanFab() {
  const pathname = usePathname();
  const { t } = useI18n();

  if (!pathname.startsWith("/dashboard") || pathname.startsWith("/dashboard/scan")) return null;
  if (pathname.startsWith("/dashboard/display")) return null;

  return (
    <Link
      href="/dashboard/scan"
      className="fixed left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-lg md:hidden"
      style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
    >
      <ScanLine size={18} /> {t("ops.scan")}
    </Link>
  );
}
