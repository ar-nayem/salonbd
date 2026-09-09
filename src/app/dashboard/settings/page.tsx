import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { addShopImage, deleteShopImage, updateShop } from "../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { shopId } = await requireOwnerShopId();
  const { t } = await getT();

  const shop = await db.shop.findUnique({
    where: { id: shopId },
    include: { images: { orderBy: { sort: "asc" } } },
  });
  if (!shop) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.settings")}</h1>

      <Card className="p-4">
        <form action={updateShop} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="shopId" value={shop.id} />
          <div>
            <Label>Name (English)</Label>
            <Input name="name" defaultValue={shop.name} required />
          </div>
          <div>
            <Label>নাম (বাংলা)</Label>
            <Input name="nameBn" defaultValue={shop.nameBn ?? ""} />
          </div>
          <div>
            <Label>{t("auth.phone")}</Label>
            <Input name="phone" defaultValue={shop.phone} required />
          </div>
          <div>
            <Label>{t("search.type")}</Label>
            <Select name="shopType" defaultValue={shop.shopType}>
              <option value="MEN">Men</option>
              <option value="WOMEN">Women</option>
              <option value="UNISEX">Unisex</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Input name="address" defaultValue={shop.address} required />
          </div>
          <div>
            <Label>{t("search.area")}</Label>
            <Input name="area" defaultValue={shop.area} required />
          </div>
          <div>
            <Label>{t("search.city")}</Label>
            <Input name="city" defaultValue={shop.city} required />
          </div>
          <div>
            <Label>District</Label>
            <Input name="district" defaultValue={shop.district} />
          </div>
          <div>
            <Label>Cover image URL</Label>
            <Input name="coverUrl" defaultValue={shop.coverUrl ?? ""} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Latitude</Label>
              <Input name="lat" type="number" step="any" defaultValue={shop.lat ?? ""} />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input name="lng" type="number" step="any" defaultValue={shop.lng ?? ""} />
            </div>
          </div>
          <div>
            <Label>Slot step ({t("book.min")})</Label>
            <Select name="slotStepMin" defaultValue={String(shop.slotStepMin)}>
              {[10, 15, 20, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>{t("shop.about")} (English)</Label>
            <Textarea name="about" rows={3} defaultValue={shop.about ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("shop.about")} (বাংলা)</Label>
            <Textarea name="aboutBn" rows={3} defaultValue={shop.aboutBn ?? ""} />
          </div>

          <fieldset className="sm:col-span-2 space-y-2 rounded-xl border p-3">
            <legend className="px-1 text-sm font-medium">{t("book.payment")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="acceptsCash" defaultChecked={shop.acceptsCash} className="h-4 w-4" />
              {t("book.payCash")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="acceptsOnline" defaultChecked={shop.acceptsOnline} className="h-4 w-4" />
              {t("book.payOnline")}
            </label>
            <div className="max-w-[12rem]">
              <Label>Advance deposit %</Label>
              <Input name="depositPercent" type="number" min={0} max={100} defaultValue={shop.depositPercent} />
              <p className="muted mt-1 text-xs">0 = customer pays the full amount online.</p>
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="queueEnabled" defaultChecked={shop.queueEnabled} className="h-4 w-4" />
            Walk-in queue
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={shop.isActive} className="h-4 w-4" />
            Shop visible to customers
          </label>

          <div className="sm:col-span-2">
            <Button type="submit" size="lg">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4">
        <p className="mb-3 font-medium">{t("shop.gallery")}</p>
        <form action={addShopImage} className="flex flex-wrap gap-2">
          <input type="hidden" name="shopId" value={shop.id} />
          <Input name="url" placeholder="https://image-url" className="max-w-md flex-1" required />
          <Input name="caption" placeholder="Caption" className="max-w-[12rem]" />
          <Button type="submit">{t("common.add")}</Button>
        </form>

        <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
          {shop.images.map((img) => (
            <div key={img.id} className="space-y-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption ?? ""} className="aspect-square w-full rounded-xl object-cover" />
              <form action={deleteShopImage}>
                <input type="hidden" name="id" value={img.id} />
                <Button size="sm" variant="ghost" className="w-full text-red-600" type="submit">
                  {t("common.delete")}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
