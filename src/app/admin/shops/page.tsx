import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Select } from "@/components/ui";
import { setShopCommission, setShopStatus, setShopVerified } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "ACTIVE", "SUSPENDED", "CLOSED"];

export default async function AdminShops() {
  await requireAdminPage();
  const { t } = await getT();

  const shops = await db.shop.findMany({
    // New applications first: the approval queue is the point of this screen.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      owner: { select: { name: true, phone: true, email: true } },
      _count: { select: { bookings: true } },
    },
  });

  const pending = shops.filter((s) => s.status === "PENDING");

  return (
    <div className="space-y-4">
      {pending.length > 0 ? (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          {pending.length} shop{pending.length > 1 ? "s" : ""} waiting for approval.
        </Card>
      ) : null}

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
              <Badge
                tone={
                  s.status === "ACTIVE"
                    ? "green"
                    : s.status === "PENDING"
                      ? "amber"
                      : s.status === "SUSPENDED"
                        ? "red"
                        : "neutral"
                }
              >
                {t(`shopStatus.${s.status}`)}
              </Badge>
              <Badge tone={s.isVerified ? "green" : "neutral"}>
                {s.isVerified ? t("shop.verified") : "Unverified"}
              </Badge>
            </div>

            <form action={setShopStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={s.id} />
              <Select name="status" defaultValue={s.status} className="h-9 w-36">
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`shopStatus.${status}`)}
                  </option>
                ))}
              </Select>
              <Button size="sm" type="submit">
                {t("common.save")}
              </Button>
            </form>

            <form action={setShopVerified}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="value" value={String(!s.isVerified)} />
              <Button size="sm" variant="outline" type="submit">
                {s.isVerified ? t("admin.unverify") : t("admin.verify")}
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
              <Button size="sm" variant="ghost" type="submit">
                {t("common.save")}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
