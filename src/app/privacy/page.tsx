import type { Metadata } from "next";
import Link from "next/link";
import { getT } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { PRIVACY, PRIVACY_CONTACT, PRIVACY_UPDATED } from "./content";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What SalonBD stores, why, who sees it, and how to delete it.",
};

export default async function PrivacyPage() {
  const { locale, t } = await getT();
  const content = PRIVACY[locale];

  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("legal.privacy")}</h1>
        <p className="muted mt-1 text-sm">
          {t("legal.updated")}: {PRIVACY_UPDATED}
        </p>
      </div>

      <p className="text-sm leading-relaxed">{content.intro}</p>

      {content.sections.map((section) => (
        <Card key={section.heading} className="space-y-2 p-5">
          <h2 className="font-semibold">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="muted text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className="muted list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {section.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}

      <Card className="space-y-2 p-5 text-sm">
        <p className="font-semibold">{t("legal.contact")}</p>
        <a href={`mailto:${PRIVACY_CONTACT}`} className="text-brand-600 underline underline-offset-2">
          {PRIVACY_CONTACT}
        </a>
        <p>
          <Link href="/delete-account" className="underline underline-offset-2">
            {t("legal.deleteAccount")}
          </Link>
        </p>
      </Card>
    </div>
  );
}
