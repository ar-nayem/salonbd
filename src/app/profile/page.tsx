import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { LogOut } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { normalizePhone } from "@/lib/utils";
import { Button, Card, Input, Label } from "@/components/ui";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

async function updateProfile(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return;

  await db.user.update({
    where: { id: user.id },
    data: {
      name: name.length >= 2 ? name : user.name,
      phone,
      email: email || null,
    },
  });
  revalidatePath("/profile");
}

async function changePassword(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 6) return;

  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (record?.passwordHash) {
    const ok = await verifyPassword(current, record.passwordHash);
    if (!ok) return;
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  revalidatePath("/profile");
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.profile")}</h1>

      <Card className="p-5">
        <form action={updateProfile} className="space-y-3">
          <div>
            <Label>{t("auth.name")}</Label>
            <Input name="name" defaultValue={user.name} required />
          </div>
          <div>
            <Label>{t("auth.phone")}</Label>
            <Input name="phone" defaultValue={user.phone ?? ""} inputMode="numeric" placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <Label>{t("auth.email")}</Label>
            <Input name="email" type="email" defaultValue={user.email ?? ""} />
          </div>
          <Button type="submit">{t("common.save")}</Button>
        </form>
      </Card>

      <Card className="p-5">
        <form action={changePassword} className="space-y-3">
          <p className="font-medium">{t("auth.password")}</p>
          <Input name="current" type="password" placeholder="Current password" />
          <Input name="next" type="password" placeholder="New password" minLength={6} required />
          <Button type="submit" variant="outline">
            {t("common.save")}
          </Button>
        </form>
      </Card>

      <LogoutButton label={t("nav.logout")} />
    </div>
  );
}
