import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka } from "@/lib/utils";
import { PAID_WHERE } from "@/lib/analytics";
import { Button, Card } from "@/components/ui";
import { MaskedPhone } from "@/components/masked-phone";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  const { locale, t } = await getT();
  const q = sp.q?.trim() ?? "";

  const users = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, phone: true, email: true, createdAt: true, isGuest: true },
  });

  const spend = await db.booking.groupBy({
    by: ["customerId"],
    where: { ...PAID_WHERE, customerId: { in: users.map((u) => u.id) } },
    _sum: { total: true },
    _count: true,
    _max: { date: true },
  });

  const rows = users.map((u) => {
    const stats = spend.find((s) => s.customerId === u.id);
    const total = stats?._sum.total ?? 0;
    const count = stats?._count ?? 0;
    return {
      ...u,
      bookings: count,
      total,
      avg: count > 0 ? Math.round(total / count) : 0,
      lastOrder: stats?._max.date ?? null,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("an.customers")}</h2>
        <Link
          href="/api/admin/customers"
          className="inline-flex h-10 items-center rounded-xl border px-3 text-sm"
        >
          {t("an.export")}
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={t("common.search")}
          className="h-11 flex-1 rounded-xl border px-3 text-sm"
        />
        <Button type="submit" variant="dark">
          {t("common.search")}
        </Button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b text-left">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 text-right font-medium">{t("an.bookings")}</th>
              <th className="p-3 text-right font-medium">Spend</th>
              <th className="p-3 text-right font-medium">{t("an.avgOrder")}</th>
              <th className="p-3 font-medium">Last</th>
              <th className="p-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3">
                  {r.name}
                  {r.isGuest ? <span className="muted text-xs"> · guest</span> : null}
                </td>
                <td className="p-3">
                  <MaskedPhone phone={r.phone} label={t("an.reveal")} />
                </td>
                <td className="p-3 text-right tabular-nums">{r.bookings}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(r.total, locale)}</td>
                <td className="p-3 text-right tabular-nums">{formatTaka(r.avg, locale)}</td>
                <td className="p-3">{r.lastOrder ?? "—"}</td>
                <td className="p-3">{r.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
