import Link from "next/link";
import { Scissors, Sparkles, Clock, Wallet, Store, ArrowRight, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { SearchBox } from "@/components/search-box";
import { ShopCard } from "@/components/shop-card";
import { LinkButton, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { key: "HAIR", en: "Haircut", bn: "চুল কাটা", icon: Scissors },
  { key: "BEARD", en: "Beard & shave", bn: "দাড়ি ও শেভ", icon: Sparkles },
  { key: "FACIAL", en: "Facial", bn: "ফেসিয়াল", icon: Sparkles },
  { key: "COLOR", en: "Hair colour", bn: "হেয়ার কালার", icon: Sparkles },
  { key: "BRIDAL", en: "Bridal", bn: "ব্রাইডাল", icon: Sparkles },
  { key: "MASSAGE", en: "Massage", bn: "ম্যাসাজ", icon: Sparkles },
];

export default async function HomePage() {
  const { locale, t } = await getT();

  const where = { isActive: true } as const;
  const select = {
    id: true,
    slug: true,
    name: true,
    nameBn: true,
    area: true,
    city: true,
    coverUrl: true,
    ratingAvg: true,
    reviewCount: true,
    isVerified: true,
    shopType: true,
    services: { where: { isActive: true }, select: { price: true }, orderBy: { price: "asc" as const }, take: 1 },
  };

  const [popular, topRated, areas] = await Promise.all([
    db.shop.findMany({ where, select, orderBy: { bookingCount: "desc" }, take: 8 }),
    db.shop.findMany({
      where: { ...where, reviewCount: { gt: 0 } },
      select,
      orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
      take: 8,
    }),
    db.shop.groupBy({ by: ["area", "city"], where, _count: true, orderBy: { _count: { area: "desc" } }, take: 10 }),
  ]);

  const toCard = (s: (typeof popular)[number]) => ({
    ...s,
    minPrice: s.services[0]?.price ?? null,
  });

  return (
    <div className="space-y-10">
      <section className="fade-up overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-5 py-10 text-white md:px-10 md:py-14">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
          <MapPin size={13} /> Bangladesh
        </p>
        <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight md:text-5xl">
          {t("app.tagline")}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
          {t("home.step1Body")} {t("home.step3Body")}
        </p>
        <div className="mt-6 max-w-xl">
          <SearchBox />
        </div>
      </section>

      <section>
        <SectionTitle title={t("home.categories")} />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/shops?category=${c.key}`}
              className="card flex min-w-[7.5rem] flex-col items-center gap-2 rounded-2xl px-4 py-4 text-center transition hover:shadow-md"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <c.icon size={18} />
              </span>
              <span className="text-xs font-medium">{locale === "bn" ? c.bn : c.en}</span>
            </Link>
          ))}
        </div>
      </section>

      {popular.length > 0 ? (
        <section>
          <SectionTitle
            title={t("home.nearYou")}
            action={
              <Link href="/shops" className="text-sm font-medium text-brand-600 hover:underline">
                {t("home.viewAll")}
              </Link>
            }
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {popular.map((s) => (
              <ShopCard key={s.id} shop={toCard(s)} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {topRated.length > 0 ? (
        <section>
          <SectionTitle title={t("home.topRated")} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {topRated.map((s) => (
              <ShopCard key={s.id} shop={toCard(s)} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {areas.length > 0 ? (
        <section>
          <SectionTitle title={t("home.browseAreas")} />
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Link
                key={`${a.city}-${a.area}`}
                href={`/shops?area=${encodeURIComponent(a.area)}`}
                className="card rounded-full px-4 py-2 text-sm transition hover:shadow-sm"
              >
                {a.area} <span className="muted text-xs">({a._count})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionTitle title={t("home.howItWorks")} />
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: Scissors, title: t("home.step1"), body: t("home.step1Body") },
            { icon: Clock, title: t("home.step2"), body: t("home.step2Body") },
            { icon: Wallet, title: t("home.step3"), body: t("home.step3Body") },
          ].map((s, i) => (
            <div key={i} className="card rounded-2xl p-5">
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                <s.icon size={18} />
              </span>
              <p className="font-semibold">{s.title}</p>
              <p className="muted mt-1 text-sm">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-start gap-4 rounded-3xl p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-500 text-ink-950">
            <Store size={20} />
          </span>
          <div>
            <p className="text-lg font-semibold">{t("home.forOwners")}</p>
            <p className="muted mt-1 max-w-lg text-sm">{t("home.forOwnersBody")}</p>
          </div>
        </div>
        <LinkButton href="/for-owners" variant="dark" size="lg" className="w-full md:w-auto">
          {t("home.ctaOwner")} <ArrowRight size={16} />
        </LinkButton>
      </section>
    </div>
  );
}
