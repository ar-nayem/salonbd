import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { deleteStation, saveStation } from "../actions";

export const dynamic = "force-dynamic";

export default async function StationsPage() {
  const { shopId } = await requireShopPage();
  const { t } = await getT();

  const stations = await db.station.findMany({
    where: { shopId },
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { qrCodes: { select: { token: true }, take: 1 } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("ops.stations")}</h1>
      <p className="muted text-sm">
        Each chair gets its own code. A customer who scans it books at that chair — the code
        carries a token, never the chair id.
      </p>

      <Card className="p-4">
        <form action={saveStation} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="shopId" value={shopId} />
          <input type="hidden" name="isActive" value="on" />
          <div>
            <Label>{t("common.add")}</Label>
            <Input name="name" required placeholder="Chair 1" />
          </div>
          <div>
            <Label>Area</Label>
            <Input name="area" placeholder="Ground floor" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              {t("common.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stations.map((s) => (
          <Card key={s.id} className="space-y-3 p-4 text-center">
            {s.qrCodes[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr/${s.qrCodes[0].token}/png?size=256`}
                alt={s.name}
                className="mx-auto h-32 w-32 rounded-xl bg-white p-2"
              />
            ) : null}
            <div>
              <p className="font-medium">{s.name}</p>
              {s.area ? <p className="muted text-xs">{s.area}</p> : null}
            </div>
            <Badge tone={s.isActive ? "green" : "neutral"}>
              {s.isActive ? t("common.active") : t("common.inactive")}
            </Badge>
            <form action={deleteStation}>
              <input type="hidden" name="id" value={s.id} />
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
