"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Scissors, Menu, X, Globe, LogOut, LayoutDashboard, ShieldCheck, CalendarDays, Heart, User as UserIcon } from "lucide-react";
import { useI18n } from "./locale-provider";
import type { Locale } from "@/lib/dictionaries";
import type { Role } from "@prisma/client";
import { Button, LinkButton } from "./ui";

type HeaderUser = {
  id: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
} | null;

const SHOP_ROLES: Role[] = ["OWNER", "STAFF"];
const ADMIN_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export function SiteHeader({ user, locale }: { user: HeaderUser; locale: Locale }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function switchLocale() {
    const next: Locale = locale === "bn" ? "en" : "bn";
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--card)]/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-600 text-white">
            <Scissors size={16} />
          </span>
          <span>{t("app.name")}</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link href="/shops" className="rounded-lg px-3 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.06]">
            {t("nav.explore")}
          </Link>
          {user ? (
            <Link href="/bookings" className="rounded-lg px-3 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.06]">
              {t("nav.bookings")}
            </Link>
          ) : null}
          {user && SHOP_ROLES.includes(user.role) ? (
            <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.06]">
              {t("nav.dashboard")}
            </Link>
          ) : null}
          {user && ADMIN_ROLES.includes(user.role) ? (
            <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.06]">
              {t("nav.admin")}
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={switchLocale}
            disabled={pending}
            aria-label="Switch language"
            className="gap-1.5"
          >
            <Globe size={16} />
            <span className="text-xs font-semibold">{locale === "bn" ? "EN" : "বাং"}</span>
          </Button>

          {user ? (
            <div className="hidden md:block">
              <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
                {user.name.split(" ")[0]}
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <LinkButton href="/login" variant="ghost" size="sm">
                {t("nav.login")}
              </LinkButton>
              <LinkButton href="/signup" size="sm">
                {t("nav.signup")}
              </LinkButton>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t bg-[var(--card)] px-4 py-3">
          <div className="mx-auto grid w-full max-w-6xl gap-1 text-sm">
            {user ? (
              <>
                <p className="muted px-3 py-2 text-xs uppercase tracking-wide">{user.name}</p>
                <MenuLink href="/bookings" icon={<CalendarDays size={16} />} label={t("nav.bookings")} onClick={() => setOpen(false)} />
                <MenuLink href="/favorites" icon={<Heart size={16} />} label={t("nav.favorites")} onClick={() => setOpen(false)} />
                <MenuLink href="/profile" icon={<UserIcon size={16} />} label={t("nav.profile")} onClick={() => setOpen(false)} />
                {SHOP_ROLES.includes(user.role) ? (
                  <MenuLink href="/dashboard" icon={<LayoutDashboard size={16} />} label={t("nav.dashboard")} onClick={() => setOpen(false)} />
                ) : null}
                {ADMIN_ROLES.includes(user.role) ? (
                  <MenuLink href="/admin" icon={<ShieldCheck size={16} />} label={t("nav.admin")} onClick={() => setOpen(false)} />
                ) : null}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  <LogOut size={16} />
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <MenuLink href="/shops" label={t("nav.explore")} onClick={() => setOpen(false)} />
                <MenuLink href="/login" label={t("nav.login")} onClick={() => setOpen(false)} />
                <MenuLink href="/signup" label={t("nav.signup")} onClick={() => setOpen(false)} />
                <MenuLink href="/for-owners" label={t("nav.listShop")} onClick={() => setOpen(false)} />
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  label,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
    >
      {icon}
      {label}
    </Link>
  );
}
