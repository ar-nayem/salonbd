import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { DeleteAccountForm } from "@/components/delete-account-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Delete account" };

export default async function DeleteAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/delete");
  const { t } = await getT();

  const record = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("del.title")}</h1>
        <p className="muted mt-1 text-sm">{user.name}</p>
      </div>

      <DeleteAccountForm hasPassword={Boolean(record?.passwordHash)} />

      <p className="muted text-sm">
        <Link href="/privacy" className="underline underline-offset-2">
          {t("legal.privacy")}
        </Link>
      </p>
    </div>
  );
}
