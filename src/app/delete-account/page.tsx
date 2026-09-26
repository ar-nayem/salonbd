import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/i18n";
import { Card, LinkButton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your SalonBD account and what happens to your data.",
};

/**
 * Reachable without signing in and without installing anything — this is the
 * URL Google Play asks for in the data safety section.
 */
export default async function PublicDeleteAccountPage() {
  const { t } = await getT();
  const contact = "nayem3622@gmail.com";

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("del.howTitle")}</h1>

      <Card className="space-y-3 p-5">
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          <li>{t("del.howStep1")}</li>
          <li>{t("del.howStep2")}</li>
          <li>{t("del.howStep3")}</li>
        </ol>
        <LinkButton href="/account/delete" size="md">
          {t("del.openPage")}
        </LinkButton>
      </Card>

      <Card className="space-y-2 p-5">
        <p className="font-semibold">{t("del.title")}</p>
        <p className="muted whitespace-pre-line text-sm">{t("del.what")}</p>
      </Card>

      <Card className="space-y-2 p-5 text-sm">
        <p className="muted">{t("del.howNoAccess")}</p>
        <p>
          <a href={`mailto:${contact}`} className="text-brand-600 underline underline-offset-2">
            {contact}
          </a>
        </p>
      </Card>

      <p className="muted text-sm">
        <Link href="/privacy" className="underline underline-offset-2">
          {t("legal.privacy")}
        </Link>
      </p>
    </div>
  );
}
