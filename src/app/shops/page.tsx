import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { ShopCard } from "@/components/shop-card";
import { SearchBox } from "@/components/search-box";
import { EmptyState, Select } from "@/components/ui";
import { SearchX } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function ShopsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { locale, t } = await getT();

  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const area = typeof sp.area === "string" ? sp.area : "";
  const city = typeof sp.city === "string" ? sp.city : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "rating";

  const where: Prisma.ShopWhereInput = {
    isActive: true,
    ...(area ? { area } : {}),
    ...(city ? { city } : {}),
    ...(type ? { shopType: type } : {}),
    ...(category ? { services: { some: { category, isActive: true } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { nameBn: { contains: q } },
            { area: { contains: q } },
            { city: { contains: q } },
            { address: { contains: q } },
            { services: { some: { name: { contains: q }, isActive: true } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ShopOrderByWithRelationInput[] =
    sort === "popular"
      ? [{ bookingCount: "desc" }, { ratingAvg: "desc" }]
      : sort === "new"
        ? [{ createdAt: "desc" }]
        : [{ ratingAvg: "desc" }, { reviewCount: "desc" }];

  const [shops, areas, cities] = await Promise.all([
    db.shop.findMany({
      where,
      orderBy,
      take: 60,
      select: {
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
        services: {
          where: { isActive: true },
          select: { price: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
    }),
    db.shop.findMany({ where: { isActive: true }, distinct: ["area"], select: { area: true }, orderBy: { area: "asc" } }),
    db.shop.findMany({ where: { isActive: true }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);

  return (
    <div className="space-y-5">
      <SearchBox defaultValue={q} />

      <form className="card flex flex-wrap items-end gap-3 rounded-2xl p-3" method="GET">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}

        <div className="min-w-[9rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("search.area")}</label>
          <Select name="area" defaultValue={area}>
            <option value="">{t("search.allAreas")}</option>
            {areas.map((a) => (
              <option key={a.area} value={a.area}>
                {a.area}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[9rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("search.city")}</label>
          <Select name="city" defaultValue={city}>
            <option value="">{t("search.allCities")}</option>
            {cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[8rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("search.type")}</label>
          <Select name="type" defaultValue={type}>
            <option value="">{t("common.all")}</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
            <option value="UNISEX">Unisex</option>
          </Select>
        </div>

        <div className="min-w-[9rem] flex-1">
          <label className="muted mb-1 block text-xs">{t("search.sort")}</label>
          <Select name="sort" defaultValue={sort}>
            <option value="rating">{t("search.sortRating")}</option>
            <option value="popular">{t("search.sortPopular")}</option>
            <option value="new">{t("search.sortNew")}</option>
          </Select>
        </div>

        <button
          type="submit"
          className="h-11 rounded-xl bg-ink-900 px-5 text-sm font-medium text-white dark:bg-white dark:text-ink-900"
        >
          {t("search.apply")}
        </button>
      </form>

      <p className="muted text-sm">
        {shops.length} {t("search.results")}
      </p>

      {shops.length === 0 ? (
        <EmptyState icon={<SearchX size={28} />} title={t("search.noResults")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {shops.map((s) => (
            <ShopCard key={s.id} shop={{ ...s, minPrice: s.services[0]?.price ?? null }} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
