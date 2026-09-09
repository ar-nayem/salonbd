import Link from "next/link";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input } from "@/components/ui";
import { setShopActive, setShopCommission, setShopVerified } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminShops() {
  const { t } = await getT();
  const shops = await db.shop.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: { select: { name: true, phone: true, email: true } }, _count: { select: { bookings: true } } },
  });

  return (
    <div className="space-y-2">
      {shops.map((s) => (
        <Card key={s.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <Link href={`/shops/${s.slug}`} className="font-medium hover:underline">
              {s.name}
            </Link>
            <p className="muted text-sm">
              {s.area}, {s.city} · {s.owner.name} · {s.owner.phone ?? s.owner.email ?? "—"} ·{" "}
              {s._count.bookings} bookings
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={s.isVerified ? "green" : "amber"}>
              {s.isVerified ? t("shop.verified") : "Unverified"}
            </Badge>
            <Badge tone={s.isActive ? "green" : "red"}>
              {s.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          </div>

          <form action={setShopVerified}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="value" value={String(!s.isVerified)} />
            <Button size="sm" variant="outline" type="submit">
              {s.isVerified ? t("admin.unverify") : t("admin.verify")}
            </Button>
          </form>

          <form action={setShopActive}>
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="value" value={String(!s.isActive)} />
            <Button size="sm" variant="outline" type="submit">
              {s.isActive ? "Disable" : "Enable"}
            </Button>
          </form>

          <form action={setShopCommission} className="flex items-center gap-1">
            <input type="hidden" name="id" value={s.id} />
            <Input
              name="commission"
              type="number"
              min={0}
              max={50}
              defaultValue={Math.round(s.commissionRate * 100)}
              className="h-9 w-20"
            />
            <span className="muted text-xs">%</span>
            <Button size="sm" type="submit">
              {t("common.save")}
            </Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
