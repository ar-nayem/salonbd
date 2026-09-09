import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { PUBLIC_SERVICE_WHERE } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { ShopCard } from "@/components/shop-card";
import { EmptyState, LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/favorites");
  const { locale, t } = await getT();

  const favorites = await db.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      shop: {
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
          services: { where: PUBLIC_SERVICE_WHERE, select: { price: true }, orderBy: { price: "asc" }, take: 1 },
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.favorites")}</h1>
      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart size={28} />}
          title={t("search.noResults")}
          action={<LinkButton href="/shops">{t("nav.explore")}</LinkButton>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {favorites.map((f) => (
            <ShopCard
              key={f.id}
              shop={{ ...f.shop, minPrice: f.shop.services[0]?.price ?? null }}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
