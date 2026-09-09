import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatTaka } from "@/lib/utils";
import { Badge, Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  deleteAddon,
  deleteOption,
  deleteOptionGroup,
  deleteService,
  saveAddon,
  saveOption,
  saveOptionGroup,
  saveService,
  uploadServiceImage,
} from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["HAIR", "BEARD", "FACIAL", "COLOR", "SPA", "BRIDAL", "MASSAGE", "OTHER"];
const STATUSES = ["AVAILABLE", "SOLD_OUT", "HIDDEN"];

export default async function ServicesPage() {
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();

  const services = await db.service.findMany({
    where: { shopId },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    include: {
      optionGroups: { orderBy: { sort: "asc" }, include: { options: { orderBy: { sort: "asc" } } } },
      addons: { orderBy: { sort: "asc" } },
    },
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
                  {t(`cat.${c}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t("common.price")}</Label>
              <Input name="price" type="number" min={0} required defaultValue={200} />
            </div>
            <div>
              <Label>Offer ৳</Label>
              <Input name="discountPrice" type="number" min={0} placeholder="—" />
            </div>
            <div>
              <Label>{t("book.min")}</Label>
              <Input name="durationMin" type="number" min={5} step={5} required defaultValue={30} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Description</Label>
            <Textarea name="description" rows={2} />
          </div>
          <input type="hidden" name="status" value="AVAILABLE" />
          <div className="sm:col-span-2">
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {services.map((s) => (
          <Card key={s.id} className="space-y-4 p-4">
            <form action={saveService} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="shopId" value={shopId} />
              <div className="flex items-center justify-between gap-2 sm:col-span-2">
                <p className="font-medium">
                  {s.name}{" "}
                  <span className="muted text-sm">
                    · {formatTaka(s.discountPrice ?? s.price, locale)}
                  </span>
                </p>
                <Badge
                  tone={s.status === "AVAILABLE" ? "green" : s.status === "SOLD_OUT" ? "amber" : "neutral"}
                >
                  {t(`svc.${s.status}`)}
                </Badge>
              </div>

              <Input name="name" defaultValue={s.name} required />
              <Input name="nameBn" defaultValue={s.nameBn ?? ""} placeholder="বাংলা নাম" />
              <Select name="category" defaultValue={s.category}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cat.${c}`)}
                  </option>
                ))}
              </Select>
              <div className="grid grid-cols-3 gap-3">
                <Input name="price" type="number" min={0} defaultValue={s.price} />
                <Input
                  name="discountPrice"
                  type="number"
                  min={0}
                  defaultValue={s.discountPrice ?? ""}
                  placeholder="Offer"
                />
                <Input name="durationMin" type="number" min={5} step={5} defaultValue={s.durationMin} />
              </div>
              <Textarea name="description" rows={2} defaultValue={s.description ?? ""} className="sm:col-span-2" />
              <Select name="status" defaultValue={s.status}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(`svc.${status}`)}
                  </option>
                ))}
              </Select>
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  {t("common.save")}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              {s.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.imageUrl} alt={s.name} className="h-16 w-16 rounded-xl object-cover" />
              ) : null}
              <form action={uploadServiceImage} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="shopId" value={shopId} />
                <input type="hidden" name="serviceId" value={s.id} />
                <input
                  type="file"
                  name="file"
                  accept="image/*"
                  className="text-xs file:mr-2 file:rounded-lg file:border file:px-3 file:py-1.5 file:text-xs"
                />
                <Button size="sm" variant="outline" type="submit">
                  Upload photo
                </Button>
              </form>
            </div>

            <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("book.options")}</p>
                {s.optionGroups.map((group) => (
                  <div key={group.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {group.name}
                        {group.required ? <span className="text-red-600"> *</span> : null}
                      </p>
                      <form action={deleteOptionGroup}>
                        <input type="hidden" name="id" value={group.id} />
                        <Button size="sm" variant="ghost" className="text-red-600" type="submit">
                          {t("common.delete")}
                        </Button>
                      </form>
                    </div>

                    <ul className="mt-1 space-y-1">
                      {group.options.map((option) => (
                        <li key={option.id} className="flex items-center justify-between text-sm">
                          <span>
                            {option.name}
                            {option.priceDelta ? ` +${formatTaka(option.priceDelta, locale)}` : ""}
                            {option.durationDelta ? ` · +${option.durationDelta}m` : ""}
                          </span>
                          <form action={deleteOption}>
                            <input type="hidden" name="id" value={option.id} />
                            <button type="submit" className="text-xs text-red-600">
                              ✕
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>

                    <form action={saveOption} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="groupId" value={group.id} />
                      <Input name="name" placeholder="Option" className="h-9 flex-1" required />
                      <Input name="priceDelta" type="number" placeholder="৳" className="h-9 w-20" />
                      <Input name="durationDelta" type="number" placeholder="min" className="h-9 w-20" />
                      <Button size="sm" type="submit">
                        {t("common.add")}
                      </Button>
                    </form>
                  </div>
                ))}

                <form action={saveOptionGroup} className="flex flex-wrap gap-2">
                  <input type="hidden" name="shopId" value={shopId} />
                  <input type="hidden" name="serviceId" value={s.id} />
                  <Input name="name" placeholder="Group name (e.g. Length)" className="h-9 flex-1" required />
                  <Input name="maxSelect" type="number" min={1} defaultValue={1} className="h-9 w-20" />
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" name="required" className="h-3.5 w-3.5" /> required
                  </label>
                  <Button size="sm" variant="outline" type="submit">
                    {t("common.add")}
                  </Button>
                </form>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">{t("book.addons")}</p>
                <ul className="space-y-1">
                  {s.addons.map((addon) => (
                    <li key={addon.id} className="flex items-center justify-between text-sm">
                      <span>
                        {addon.name} +{formatTaka(addon.price, locale)}
                        {addon.durationMin ? ` · +${addon.durationMin}m` : ""}
                      </span>
                      <form action={deleteAddon}>
                        <input type="hidden" name="id" value={addon.id} />
                        <button type="submit" className="text-xs text-red-600">
                          ✕
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
                <form action={saveAddon} className="flex flex-wrap gap-2">
                  <input type="hidden" name="shopId" value={shopId} />
                  <input type="hidden" name="serviceId" value={s.id} />
                  <Input name="name" placeholder="Add-on" className="h-9 flex-1" required />
                  <Input name="price" type="number" min={0} placeholder="৳" className="h-9 w-20" />
                  <Input name="durationMin" type="number" min={0} placeholder="min" className="h-9 w-20" />
                  <Button size="sm" variant="outline" type="submit">
                    {t("common.add")}
                  </Button>
                </form>
              </div>
            </div>

            <form action={deleteService} className="flex justify-end border-t pt-3">
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
