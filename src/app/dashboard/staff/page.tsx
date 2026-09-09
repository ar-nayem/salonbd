import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { deleteStaff, saveStaff } from "../actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const { shopId } = await requireOwnerShopId();
  const { t } = await getT();

  const [staff, services] = await Promise.all([
    db.staff.findMany({
      where: { shopId },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
      include: { services: { select: { serviceId: true } } },
    }),
    db.service.findMany({ where: { shopId, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.staff")}</h1>

      <Card className="p-4">
        <p className="mb-3 font-medium">{t("common.add")}</p>
        <form action={saveStaff} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>{t("auth.name")}</Label>
            <Input name="name" required placeholder="Rakib Hasan" />
          </div>
          <div>
            <Label>Title</Label>
            <Input name="title" placeholder="Senior barber" />
          </div>
          <div className="sm:col-span-2">
            <Label>Photo URL</Label>
            <Input name="avatarUrl" placeholder="https://..." />
          </div>
          <fieldset className="sm:col-span-2">
            <Label>{t("dash.services")}</Label>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm">
                  <input type="checkbox" name="serviceIds" value={s.id} className="h-3.5 w-3.5" />
                  {s.name}
                </label>
              ))}
            </div>
            <p className="muted mt-1 text-xs">Leave all unchecked if this barber does every service.</p>
          </fieldset>
          <input type="hidden" name="isActive" value="on" />
          <div className="sm:col-span-2">
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {staff.map((s) => (
          <Card key={s.id} className="p-4">
            <form action={saveStaff} className="space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="shopId" value={shopId} />
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.name}</p>
                <Badge tone={s.isActive ? "green" : "neutral"}>
                  {s.isActive ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
              <Input name="name" defaultValue={s.name} required />
              <Input name="title" defaultValue={s.title ?? ""} placeholder="Title" />
              <Input name="avatarUrl" defaultValue={s.avatarUrl ?? ""} placeholder="Photo URL" />
              <Textarea name="bio" rows={2} defaultValue={s.bio ?? ""} placeholder="Bio" />
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => (
                  <label key={svc.id} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={svc.id}
                      defaultChecked={s.services.some((x) => x.serviceId === svc.id)}
                      className="h-3.5 w-3.5"
                    />
                    {svc.name}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={s.isActive} className="h-4 w-4" />
                {t("common.active")}
              </label>
              <Button type="submit" size="sm">
                {t("common.save")}
              </Button>
            </form>
            <form action={deleteStaff} className="mt-2">
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
