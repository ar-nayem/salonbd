import Link from "next/link";
import { getT } from "@/lib/i18n";

/** Play requires the privacy policy to be reachable in-app, not only in the listing. */
export async function SiteFooter() {
  const { t } = await getT();

  return (
    <footer className="mt-10 border-t px-4 py-6 md:py-8">
      <div className="muted mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span>© {new Date().getFullYear()} {t("app.name")}</span>
        <Link href="/privacy" className="hover:underline">
          {t("legal.privacy")}
        </Link>
        <Link href="/delete-account" className="hover:underline">
          {t("legal.deleteAccount")}
        </Link>
        <Link href="/for-owners" className="hover:underline">
          {t("nav.listShop")}
        </Link>
      </div>
    </footer>
  );
}
