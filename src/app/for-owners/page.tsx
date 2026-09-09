import { CalendarCheck, Wallet, Users, Star, ListOrdered, Globe } from "lucide-react";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { Card, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ForOwnersPage() {
  const { t } = await getT();
  const user = await getCurrentUser();

  const features = [
    { icon: CalendarCheck, title: "Online bookings", body: "Customers pick a barber, a day and a time. You approve or it auto-fills your calendar." },
    { icon: ListOrdered, title: "Walk-in queue", body: "Give a token number instead of a crowd at the door. Customers watch the queue from their phone." },
    { icon: Wallet, title: "Cash or online", body: "Take cash at the chair, or collect an advance through bKash, Nagad and cards." },
    { icon: Users, title: "Your barbers", body: "Each barber gets their own services, hours and leave days." },
    { icon: Star, title: "Reviews you can answer", body: "Ratings build trust, and you can reply to every one." },
    { icon: Globe, title: "Bangla and English", body: "Your shop page reads in both languages, on any phone." },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-ink-900 px-6 py-12 text-white md:px-12">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight md:text-4xl">
          {t("home.forOwners")} {t("home.forOwnersBody")}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={user ? "/dashboard/new" : "/signup"} variant="gold" size="lg">
            {t("home.ctaOwner")}
          </LinkButton>
          <LinkButton href="/shops" variant="outline" size="lg" className="border-white/30 text-white">
            {t("nav.explore")}
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="p-5">
            <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <f.icon size={18} />
            </span>
            <p className="font-semibold">{f.title}</p>
            <p className="muted mt-1 text-sm">{f.body}</p>
          </Card>
        ))}
      </section>

      <section className="card rounded-3xl p-6">
        <h2 className="text-lg font-semibold">What it costs</h2>
        <p className="muted mt-1 text-sm">
          Listing your shop is free. A commission applies only to completed bookings, set per shop by
          the platform admin. Cash bookings are settled at your counter — the platform never holds
          that money.
        </p>
      </section>
    </div>
  );
}
