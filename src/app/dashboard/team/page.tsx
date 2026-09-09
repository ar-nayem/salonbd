import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { addTeamMember, removeTeamMember } from "../actions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { shopId } = await requireShopPage();
  const { t } = await getT();

  const [shop, members] = await Promise.all([
    db.shop.findUnique({
      where: { id: shopId },
      select: { owner: { select: { name: true, phone: true, email: true } } },
    }),
    db.shopMember.findMany({
      where: { shopId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, phone: true, email: true, role: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("ops.team")}</h1>

      <Card className="p-4">
        <p className="muted mb-1 text-xs uppercase tracking-wide">Owner</p>
        <p className="font-medium">{shop?.owner.name}</p>
        <p className="muted text-sm">{shop?.owner.phone ?? shop?.owner.email ?? "—"}</p>
      </Card>

      <Card className="p-4">
        <form action={addTeamMember} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="shopId" value={shopId} />
          <div className="sm:col-span-2">
            <Label>{t("ops.addMember")}</Label>
            <Input name="contact" required placeholder="01XXXXXXXXX or email" />
            <p className="muted mt-1 text-xs">{t("ops.memberHint")}</p>
          </div>
          <div>
            <Label>Role</Label>
            <Select name="role" defaultValue="STAFF">
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
            </Select>
          </div>
          <div>
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{m.user.name}</p>
              <p className="muted text-sm">{m.user.phone ?? m.user.email ?? "—"}</p>
            </div>
            <Badge tone="blue">{m.role}</Badge>
            <form action={removeTeamMember}>
              <input type="hidden" name="id" value={m.id} />
              <Button size="sm" variant="ghost" className="text-red-600" type="submit">
                {t("common.delete")}
              </Button>
            </form>
          </Card>
        ))}
        {members.length === 0 ? <p className="muted text-sm">{t("common.none")}</p> : null}
      </div>
    </div>
  );
}
