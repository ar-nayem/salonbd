"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, CalendarDays, LayoutDashboard, User } from "lucide-react";
import { useI18n } from "./locale-provider";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

export function BottomNav({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/shops", icon: Search, label: t("nav.explore") },
    { href: "/bookings", icon: CalendarDays, label: t("nav.bookings") },
    role === "OWNER" || role === "STAFF" || role === "ADMIN" || role === "SUPER_ADMIN"
      ? { href: role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") }
      : { href: "/profile", icon: User, label: t("nav.account") },
  ];

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--card)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-4">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "text-brand-600" : "muted",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
