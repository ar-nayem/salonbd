import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { minToInput, todayISO } from "@/lib/utils";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { addClosure, deleteClosure, saveHours } from "../actions";

export const dynamic = "force-dynamic";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function HoursPage() {
  const { shopId } = await requireShopPage();
  const { t } = await getT();

  const [hours, staff, closures] = await Promise.all([
    db.workingHour.findMany({ where: { shopId, staffId: null }, orderBy: { weekday: "asc" } }),
    db.staff.findMany({ where: { shopId, isActive: true }, orderBy: { sort: "asc" } }),
    db.closure.findMany({
      where: { OR: [{ shopId }, { staff: { shopId } }], date: { gte: todayISO() } },
      orderBy: { date: "asc" },
      include: { staff: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.hours")}</h1>

      <Card className="p-4">
        <form action={saveHours} className="space-y-2">
          <input type="hidden" name="shopId" value={shopId} />
          {DAYS.map((label, weekday) => {
            const row = hours.find((h) => h.weekday === weekday);
            return (
              <div key={weekday} className="flex flex-wrap items-center gap-3 border-b py-2 last:border-0">
                <span className="w-24 text-sm font-medium">{label}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`closed-${weekday}`}
                    defaultChecked={row?.isClosed ?? false}
                    className="h-4 w-4"
                  />
                  {t("shop.closed")}
                </label>
                <input
                  type="time"
                  name={`open-${weekday}`}
                  defaultValue={minToInput(row?.openMin ?? 600)}
                  className="h-10 rounded-xl border px-3 text-sm"
                />
                <span className="muted">–</span>
                <input
                  type="time"
                  name={`close-${weekday}`}
                  defaultValue={minToInput(row?.closeMin ?? 1320)}
                  className="h-10 rounded-xl border px-3 text-sm"
                />
              </div>
            );
          })}
          <Button type="submit">{t("common.save")}</Button>
        </form>
      </Card>

      <Card className="p-4">
        <p className="mb-3 font-medium">Holidays & leave</p>
        <form action={addClosure} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>{t("common.date")}</Label>
            <Input type="date" name="date" required />
          </div>
          <div>
            <Label>{t("dash.staff")}</Label>
            <Select name="staffId" defaultValue="">
              <option value="">Whole shop</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>From</Label>
              <Input type="time" name="startMin" />
            </div>
            <div>
              <Label>To</Label>
              <Input type="time" name="endMin" />
            </div>
          </div>
          <div>
            <Label>Reason</Label>
            <Input name="reason" placeholder="Eid holiday" />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" size="sm">
              {t("common.add")}
            </Button>
          </div>
        </form>

        <ul className="mt-4 space-y-2">
          {closures.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
              <span>
                <span className="font-medium">{c.date}</span>
                {c.staff ? ` · ${c.staff.name}` : " · whole shop"}
                {c.reason ? ` · ${c.reason}` : ""}
              </span>
              <form action={deleteClosure}>
                <input type="hidden" name="id" value={c.id} />
                <Button size="sm" variant="ghost" className="text-red-600" type="submit">
                  {t("common.delete")}
                </Button>
              </form>
            </li>
          ))}
          {closures.length === 0 ? <p className="muted text-sm">{t("common.none")}</p> : null}
        </ul>
      </Card>
    </div>
  );
}
