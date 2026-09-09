import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { savePlatformPromo, togglePlatformPromo } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPromos() {
  const { t } = await getT();
  const promos = await db.promo.findMany({
    where: { shopId: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form action={savePlatformPromo} className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Code</Label>
            <Input name="code" required placeholder="SALONBD50" />
          </div>
          <div>
            <Label>Type</Label>
            <Select name="type" defaultValue="PERCENT">
              <option value="PERCENT">Percent %</option>
              <option value="FLAT">Flat ৳</option>
            </Select>
          </div>
          <div>
            <Label>Value</Label>
            <Input name="value" type="number" min={1} defaultValue={10} required />
          </div>
          <div>
            <Label>Min amount ৳</Label>
            <Input name="minAmount" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label>Max discount ৳</Label>
            <Input name="maxDiscount" type="number" min={0} />
          </div>
          <div>
            <Label>Total uses</Label>
            <Input name="usageLimit" type="number" min={1} />
          </div>
          <div>
            <Label>Per customer</Label>
            <Input name="perUserLimit" type="number" min={1} defaultValue={1} />
          </div>
          <div>
            <Label>Ends</Label>
            <Input name="endsAt" type="date" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {promos.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.code}</p>
              <p className="muted text-sm">
                {p.type === "PERCENT" ? `${p.value}%` : `৳${p.value}`} · used {p.usedCount}
                {p.usageLimit ? `/${p.usageLimit}` : ""}
              </p>
            </div>
            <Badge tone={p.isActive ? "green" : "neutral"}>
              {p.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
            <form action={togglePlatformPromo}>
              <input type="hidden" name="id" value={p.id} />
              <Button size="sm" variant="outline" type="submit">
                {p.isActive ? "Disable" : "Enable"}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
