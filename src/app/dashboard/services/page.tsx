import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { formatTaka } from "@/lib/utils";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { deleteService, saveService } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["HAIR", "BEARD", "FACIAL", "COLOR", "SPA", "BRIDAL", "MASSAGE", "OTHER"];

export default async function ServicesPage() {
  const { shopId } = await requireOwnerShopId();
  const { locale, t } = await getT();

  const services = await db.service.findMany({
    where: { shopId },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.services")}</h1>

      <Card className="p-4">
        <p className="mb-3 font-medium">{t("common.add")}</p>
        <form action={saveService} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>Name (English)</Label>
            <Input name="name" required placeholder="Haircut" />
          </div>
          <div>
            <Label>নাম (বাংলা)</Label>
            <Input name="nameBn" placeholder="চুল কাটা" />
          </div>
          <div>
            <Label>Category</Label>
            <Select name="category" defaultValue="HAIR">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("common.price")} (৳)</Label>
              <Input name="price" type="number" min={0} required defaultValue={200} />
            </div>
            <div>
              <Label>{t("book.duration")} ({t("book.min")})</Label>
              <Input name="durationMin" type="number" min={5} step={5} required defaultValue={30} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea name="description" rows={2} />
          </div>
          <input type="hidden" name="isActive" value="on" />
          <div className="sm:col-span-2">
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {services.map((s) => (
          <Card key={s.id} className="p-4">
            <form action={saveService} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="shopId" value={shopId} />
              <div className="sm:col-span-2 flex items-center justify-between gap-2">
                <p className="font-medium">
                  {s.name} <span className="muted text-sm">· {formatTaka(s.price, locale)}</span>
                </p>
                <Badge tone={s.isActive ? "green" : "neutral"}>
                  {s.isActive ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
              <Input name="name" defaultValue={s.name} required />
              <Input name="nameBn" defaultValue={s.nameBn ?? ""} placeholder="বাংলা নাম" />
              <Select name="category" defaultValue={s.category}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Input name="price" type="number" min={0} defaultValue={s.price} />
                <Input name="durationMin" type="number" min={5} step={5} defaultValue={s.durationMin} />
              </div>
              <Textarea name="description" rows={2} defaultValue={s.description ?? ""} className="sm:col-span-2" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={s.isActive} className="h-4 w-4" />
                {t("common.active")}
              </label>
              <div className="flex justify-end gap-2">
                <Button type="submit" size="sm">
                  {t("common.save")}
                </Button>
              </div>
            </form>
            <form action={deleteService} className="mt-2 flex justify-end">
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
