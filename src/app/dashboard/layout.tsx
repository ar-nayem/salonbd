import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { DashboardNav } from "@/components/dashboard-nav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const { t } = await getT();

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-3 hidden md:block">
          <p className="text-lg font-bold tracking-tight">{t("dash.title")}</p>
          <p className="muted text-xs">{user.name}</p>
        </div>
        <DashboardNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
