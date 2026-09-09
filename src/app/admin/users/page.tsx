import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Select } from "@/components/ui";
import { setUserBlocked, setUserRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const { t } = await getT();
  const q = sp.q?.trim() ?? "";

  const users = await db.user.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { bookings: true, shops: true } } },
  });

  return (
    <div className="space-y-3">
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

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{u.name}</p>
              <p className="muted text-sm">
                {u.phone ?? "—"} · {u.email ?? "—"} · {u._count.bookings} bookings ·{" "}
                {u._count.shops} shops
              </p>
            </div>
            <Badge tone={u.isBlocked ? "red" : "green"}>{u.isBlocked ? "Blocked" : "Active"}</Badge>

            <form action={setUserRole} className="flex items-center gap-2">
              <input type="hidden" name="id" value={u.id} />
              <Select name="role" defaultValue={u.role} className="h-9 w-32">
                <option value="CUSTOMER">Customer</option>
                <option value="STAFF">Shop staff</option>
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </Select>
              <Button size="sm" type="submit">
                {t("common.save")}
              </Button>
            </form>

            <form action={setUserBlocked}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="value" value={String(!u.isBlocked)} />
              <Button size="sm" variant="outline" type="submit" className={u.isBlocked ? "" : "text-red-600"}>
                {u.isBlocked ? t("admin.unblock") : t("admin.block")}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
