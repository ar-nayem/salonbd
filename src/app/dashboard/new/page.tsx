import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { createShop } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/new");
  const { t } = await getT();

  const existing = await db.shop.findFirst({ where: { ownerId: user.id }, select: { id: true } });
  if (existing) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">{t("dash.createShop")}</h1>
      <p className="muted mb-4 text-sm">{t("home.forOwnersBody")}</p>

      <Card className="p-5">
        <form action={createShop} className="space-y-3">
          <div>
            <Label>Shop name (English)</Label>
            <Input name="name" required minLength={2} placeholder="Gentleman's Cut" />
          </div>
          <div>
            <Label>শপের নাম (বাংলা)</Label>
            <Input name="nameBn" placeholder="জেন্টলম্যান'স কাট" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input name="phone" required placeholder="01XXXXXXXXX" inputMode="numeric" />
            </div>
            <div>
              <Label>{t("search.type")}</Label>
              <Select name="shopType" defaultValue="UNISEX">
                <option value="MEN">Men</option>
                <option value="WOMEN">Women</option>
                <option value="UNISEX">Unisex</option>
              </Select>
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input name="address" required placeholder="House 12, Road 5" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{t("search.area")}</Label>
              <Input name="area" required placeholder="Dhanmondi" />
            </div>
            <div>
              <Label>{t("search.city")}</Label>
              <Input name="city" required defaultValue="Dhaka" />
            </div>
            <div>
              <Label>District</Label>
              <Input name="district" placeholder="Dhaka" />
            </div>
          </div>
          <div>
            <Label>{t("shop.about")}</Label>
            <Textarea name="about" rows={3} />
          </div>
          <Button type="submit" size="lg" className="w-full">
            {t("common.create")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
