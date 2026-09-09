import Link from "next/link";
import { MapPin, BadgeCheck, Scissors } from "lucide-react";
import { Rating } from "./rating";
import { formatTaka } from "@/lib/utils";

export type ShopCardData = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  area: string;
  city: string;
  coverUrl: string | null;
  ratingAvg: number;
  reviewCount: number;
  isVerified: boolean;
  shopType: string;
  minPrice?: number | null;
};

export function ShopCard({ shop, locale }: { shop: ShopCardData; locale: string }) {
  const name = locale === "bn" && shop.nameBn ? shop.nameBn : shop.name;
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="card group flex flex-col overflow-hidden rounded-2xl transition hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-100 dark:bg-ink-800">
        {shop.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.coverUrl}
            alt={name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-400">
            <Scissors size={28} />
          </div>
        )}
        {shop.isVerified ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-medium text-brand-700 shadow">
            <BadgeCheck size={13} /> Verified
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold">{name}</h3>
          <Rating value={shop.ratingAvg} count={shop.reviewCount} />
        </div>
        <p className="muted flex items-center gap-1 text-xs">
          <MapPin size={12} /> {shop.area}, {shop.city}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] dark:bg-ink-800">
            {shop.shopType === "MEN" ? "Men" : shop.shopType === "WOMEN" ? "Women" : "Unisex"}
          </span>
          {shop.minPrice ? (
            <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {formatTaka(shop.minPrice, locale)}+
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
