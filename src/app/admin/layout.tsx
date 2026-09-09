import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  // A logged-in non-admin gets a 404, not a redirect that confirms the tree.
  if (!isAdmin(user.role)) notFound();
  const { t } = await getT();

  const items = [
    { href: "/admin", label: t("dash.overview") },
    { href: "/admin/shops", label: t("admin.shops") },
    { href: "/admin/users", label: t("admin.users") },
    { href: "/admin/bookings", label: t("admin.bookings") },
    { href: "/admin/analytics", label: t("an.sales") },
    { href: "/admin/finance", label: t("an.finance") },
    { href: "/admin/customers", label: t("an.customers") },
    { href: "/admin/demographics", label: t("an.demographics") },
    { href: "/admin/promos", label: t("admin.promos") },
    { href: "/admin/payouts", label: t("admin.payouts") },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
      <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className="shrink-0 rounded-xl border px-3 py-2 text-sm hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            {i.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
