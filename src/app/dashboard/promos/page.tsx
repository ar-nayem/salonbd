import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { deletePromo, savePromo } from "../actions";

export const dynamic = "force-dynamic";

export default async function PromosPage() {
  const { shopId } = await requireShopPage();
  const { t } = await getT();

  const promos = await db.promo.findMany({ where: { shopId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.promos")}</h1>

      <Card className="p-4">
        <form action={savePromo} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>Code</Label>
            <Input name="code" required placeholder="EID25" />
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
            <Input name="value" type="number" min={1} required defaultValue={10} />
          </div>
          <div>
            <Label>Min amount ৳</Label>
            <Input name="minAmount" type="number" min={0} defaultValue={0} />
          </div>
          <div>
            <Label>Max discount ৳</Label>
            <Input name="maxDiscount" type="number" min={0} placeholder="optional" />
          </div>
          <div>
            <Label>Total uses</Label>
            <Input name="usageLimit" type="number" min={1} placeholder="unlimited" />
          </div>
          <div>
            <Label>Uses per customer</Label>
            <Input name="perUserLimit" type="number" min={1} defaultValue={1} />
          </div>
          <div>
            <Label>Ends</Label>
            <Input name="endsAt" type="date" />
          </div>
          <input type="hidden" name="isActive" value="on" />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              {t("common.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {promos.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.code}</p>
              <p className="muted text-sm">
                {p.type === "PERCENT" ? `${p.value}%` : `৳${p.value}`}
                {p.minAmount ? ` · min ৳${p.minAmount}` : ""}
                {p.maxDiscount ? ` · max ৳${p.maxDiscount}` : ""} · used {p.usedCount}
                {p.usageLimit ? `/${p.usageLimit}` : ""}
              </p>
            </div>
            <Badge tone={p.isActive ? "green" : "neutral"}>
              {p.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
            <form action={savePromo} className="flex items-center gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="shopId" value={shopId} />
              <input type="hidden" name="code" value={p.code} />
              <input type="hidden" name="type" value={p.type} />
              <input type="hidden" name="value" value={p.value} />
              <input type="hidden" name="minAmount" value={p.minAmount} />
              <input type="hidden" name="perUserLimit" value={p.perUserLimit} />
              {p.isActive ? null : <input type="hidden" name="isActive" value="on" />}
              <Button size="sm" variant="outline" type="submit">
                {p.isActive ? "Disable" : "Enable"}
              </Button>
            </form>
            <form action={deletePromo}>
              <input type="hidden" name="id" value={p.id} />
              <Button size="sm" variant="ghost" className="text-red-600" type="submit">
                {t("common.delete")}
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}
