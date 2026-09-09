import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { PUBLIC_SERVICE_WHERE, PUBLIC_SHOP_WHERE } from "@/lib/constants";
import { getT } from "@/lib/i18n";
import { FAR_AWAY_KM, formatDistance, haversineKm } from "@/lib/geo";
import { ShopCard } from "@/components/shop-card";
import { SearchBox } from "@/components/search-box";
import { LocationBar } from "@/components/location-bar";
import { Card, EmptyState, LinkButton, Select } from "@/components/ui";
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
  const lat = typeof sp.lat === "string" ? Number(sp.lat) : null;
  const lng = typeof sp.lng === "string" ? Number(sp.lng) : null;
  const hasFix = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  const where: Prisma.ShopWhereInput = {
    ...PUBLIC_SHOP_WHERE,
    ...(area ? { area } : {}),
    ...(city ? { city } : {}),
    ...(type ? { shopType: type } : {}),
    ...(category ? { services: { some: { category, ...PUBLIC_SERVICE_WHERE } } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { nameBn: { contains: q } },
            { area: { contains: q } },
            { city: { contains: q } },
            { address: { contains: q } },
            { services: { some: { name: { contains: q }, ...PUBLIC_SERVICE_WHERE } } },
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

  const [rows, areas, cities] = await Promise.all([
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
        lat: true,
        lng: true,
        coverUrl: true,
        ratingAvg: true,
        reviewCount: true,
        isVerified: true,
        shopType: true,
        services: {
          where: PUBLIC_SERVICE_WHERE,
          select: { price: true, discountPrice: true },
          orderBy: { price: "asc" },
          take: 1,
        },
      },
    }),
    db.shop.findMany({ where: PUBLIC_SHOP_WHERE, distinct: ["area"], select: { area: true }, orderBy: { area: "asc" } }),
    db.shop.findMany({ where: PUBLIC_SHOP_WHERE, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" } }),
  ]);

  // Distance is informational. It never removes a shop from the results.
  const withDistance = rows.map((shop) => ({
    ...shop,
    distanceKm:
      hasFix && shop.lat !== null && shop.lng !== null
        ? haversineKm({ lat: lat!, lng: lng! }, { lat: shop.lat, lng: shop.lng })
        : null,
  }));

  const shops =
    hasFix && sort === "near"
      ? [...withDistance].sort(
          (a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
        )
      : withDistance;

  const nearest = shops.reduce<number | null>(
    (min, s) => (s.distanceKm !== null && (min === null || s.distanceKm < min) ? s.distanceKm : min),
    null,
  );
  const everythingFar = hasFix && nearest !== null && nearest > FAR_AWAY_KM;

  return (
    <div className="space-y-5">
      <SearchBox defaultValue={q} />

      <Suspense fallback={null}>
        <LocationBar areaLabel={area || city || null} />
      </Suspense>

      <form className="card flex flex-wrap items-end gap-3 rounded-2xl p-3" method="GET">
        {q ? <input type="hidden" name="q" value={q} /> : null}
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {hasFix ? (
          <>
            <input type="hidden" name="lat" value={String(lat)} />
            <input type="hidden" name="lng" value={String(lng)} />
          </>
        ) : null}

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
            {hasFix ? <option value="near">{t("loc.nearYou")}</option> : null}
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

      {everythingFar ? (
        <Card className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <span>
            {t("loc.farAway")} {formatDistance(nearest!, locale)}.
          </span>
          <LinkButton href="/shops" size="sm" variant="outline">
            {t("loc.searchElsewhere")}
          </LinkButton>
        </Card>
      ) : null}

      {shops.length === 0 ? (
        <EmptyState icon={<SearchX size={28} />} title={t("search.noResults")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {shops.map((s) => (
            <ShopCard
              key={s.id}
              shop={{
                ...s,
                minPrice: s.services[0]?.discountPrice ?? s.services[0]?.price ?? null,
                distanceLabel: s.distanceKm !== null ? formatDistance(s.distanceKm, locale) : null,
              }}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
