"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Columns3,
  MonitorPlay,
  QrCode,
  Armchair,
  MessageSquare,
  UserCog,
  CalendarRange,
  Scissors,
  Users,
  Clock,
  ListOrdered,
  Star,
  Tag,
  Wallet,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "./locale-provider";

export function DashboardNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("dash.overview") },
    { href: "/dashboard/board", icon: Columns3, label: t("ops.board") },
    { href: "/dashboard/bookings", icon: CalendarDays, label: t("dash.bookings") },
    { href: "/dashboard/calendar", icon: CalendarRange, label: t("dash.calendar") },
    { href: "/dashboard/queue", icon: ListOrdered, label: t("dash.queue") },
    { href: "/dashboard/services", icon: Scissors, label: t("dash.services") },
    { href: "/dashboard/staff", icon: Users, label: t("dash.staff") },
    { href: "/dashboard/hours", icon: Clock, label: t("dash.hours") },
    { href: "/dashboard/messages", icon: MessageSquare, label: t("msg.inbox") },
    { href: "/dashboard/qr", icon: QrCode, label: t("qr.title") },
    { href: "/dashboard/stations", icon: Armchair, label: t("ops.stations") },
    { href: "/dashboard/team", icon: UserCog, label: t("ops.team") },
    { href: "/dashboard/display", icon: MonitorPlay, label: t("ops.display") },
    { href: "/dashboard/reviews", icon: Star, label: t("dash.reviews") },
    { href: "/dashboard/promos", icon: Tag, label: t("dash.promos") },
    { href: "/dashboard/earnings", icon: Wallet, label: t("dash.earnings") },
    { href: "/dashboard/settings", icon: Settings, label: t("dash.settings") },
  ];

  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:overflow-visible md:px-0">
      {items.map(({ href, icon: Icon, label }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
              active
                ? "bg-brand-600 text-white"
                : "hover:bg-black/[.04] dark:hover:bg-white/[.06]",
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
