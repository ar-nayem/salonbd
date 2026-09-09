import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { BookingFlow } from "@/components/booking-flow";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ service?: string }>;
}) {
  const { slug } = await params;
  const { service } = await searchParams;
  const { t } = await getT();
  const user = await getCurrentUser();

  const shop = await db.shop.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      acceptsCash: true,
      acceptsOnline: true,
      depositPercent: true,
      services: {
        where: { isActive: true },
        orderBy: [{ sort: "asc" }, { price: "asc" }],
        select: { id: true, name: true, nameBn: true, price: true, durationMin: true, category: true },
      },
      staff: {
        where: { isActive: true },
        orderBy: { sort: "asc" },
        select: { id: true, name: true, title: true, avatarUrl: true, ratingAvg: true },
      },
    },
  });

  if (!shop || !shop.isActive) notFound();
  if (!user) redirect(`/login?next=/shops/${slug}/book${service ? `?service=${service}` : ""}`);

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
        user={{ name: user.name, phone: user.phone }}
        preselectedServiceId={preselected}
      />
    </div>
  );
}
