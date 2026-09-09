import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { resolveQr } from "@/lib/qr";
import { PUBLIC_SERVICE_WHERE } from "@/lib/constants";
import { BookingFlow } from "@/components/booking-flow";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string; qr?: string }>;
}) {
  const { slug } = await params;
  const { service, qr } = await searchParams;
  const { t } = await getT();
  const user = await getCurrentUser();

  const shop = await db.shop.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      isActive: true,
      acceptsCash: true,
      acceptsOnline: true,
      depositPercent: true,
      services: {
        where: PUBLIC_SERVICE_WHERE,
        orderBy: [{ sort: "asc" }, { price: "asc" }],
        select: {
          id: true,
          name: true,
          nameBn: true,
          price: true,
          discountPrice: true,
          durationMin: true,
          category: true,
          optionGroups: {
            orderBy: { sort: "asc" },
            select: {
              id: true,
              name: true,
              nameBn: true,
              required: true,
              maxSelect: true,
              options: {
                where: { isActive: true },
                orderBy: { sort: "asc" },
                select: { id: true, name: true, nameBn: true, priceDelta: true, durationDelta: true },
              },
            },
          },
          addons: {
            where: { isActive: true },
            orderBy: { sort: "asc" },
            select: { id: true, name: true, nameBn: true, price: true, durationMin: true },
          },
        },
      },
      staff: {
        where: { isActive: true },
        orderBy: { sort: "asc" },
        select: { id: true, name: true, title: true, avatarUrl: true, ratingAvg: true },
      },
    },
  });

  if (!shop || shop.status !== "ACTIVE" || !shop.isActive) notFound();

  // The chair is resolved from the scanned token here, and again when the
  // booking is created. The raw station id never travels in a URL.
  let stationName: string | null = null;
  if (qr) {
    const code = await resolveQr(qr);
    if (code?.isActive && code.type === "STATION" && code.station?.shopId === shop.id) {
      stationName = code.station.name;
    }
  }

  const preselected = service && shop.services.some((s) => s.id === service) ? service : undefined;

  return (
    <div className="space-y-4">
      <div>
        <p className="muted text-sm">{shop.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">{t("book.title")}</h1>
      </div>
      <BookingFlow
        shop={{
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          acceptsCash: shop.acceptsCash,
          acceptsOnline: shop.acceptsOnline,
          depositPercent: shop.depositPercent,
        }}
        services={shop.services}
        staff={shop.staff}
        user={user ? { name: user.name, phone: user.phone, isGuest: false } : null}
        preselectedServiceId={preselected}
        qrToken={stationName ? qr : undefined}
        stationName={stationName}
      />
    </div>
  );
}
