import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Scanner } from "@/components/scanner";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireShopPage();
  const { t } = await getT();

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">{t("qr.scanTitle")}</h1>
      <p className="muted text-sm">{t("qr.scanHint")}</p>
      <Scanner />
    </div>
  );
}
