import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { QrCode, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { callerShopIds, isAdmin } from "@/lib/tenancy";
import { buyerDestination, logScan, resolveQr } from "@/lib/qr";
import { getT } from "@/lib/i18n";
import { Card, EmptyState, LinkButton } from "@/components/ui";
import { StaffVerifyPanel } from "@/components/staff-verify-panel";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The one place a printed token becomes a destination. Resolve, check it is
 * live, log the scan, then redirect or render.
 */
export default async function QrResolverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { t } = await getT();

  const qr = await resolveQr(token);
  if (!qr) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<QrCode size={30} />}
          title={t("qr.unknown")}
          body={t("qr.unknownBody")}
          action={<LinkButton href="/shops">{t("nav.explore")}</LinkButton>}
        />
      </div>
    );
  }

  const user = await getCurrentUser();
  const headerList = await headers();
  await logScan(qr.id, user?.id ?? null, headerList.get("user-agent"));

  if (!qr.isActive) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<ShieldAlert size={30} />}
          title={t("qr.inactive")}
          body={t("qr.inactiveBody")}
          action={
            qr.shop ? (
              <LinkButton href={`/shops/${qr.shop.slug}`}>{qr.shop.name}</LinkButton>
            ) : (
              <LinkButton href="/shops">{t("nav.explore")}</LinkButton>
            )
          }
        />
      </div>
    );
  }

  // Staff of this shop get the verification panel; everyone else gets the
  // buyer's own read-only view.
  const shopId = qr.shopId ?? qr.booking?.shopId ?? qr.queueToken?.shopId ?? null;
  let staffOfThisShop = false;
  if (user && shopId) {
    staffOfThisShop = isAdmin(user.role) || (await callerShopIds(user)).includes(shopId);
  }

  if (staffOfThisShop && (qr.type === "BOOKING" || qr.type === "QUEUE")) {
    if (qr.type === "BOOKING" && qr.booking) {
      const booking = await db.booking.findUnique({
        where: { id: qr.booking.id },
        include: {
          items: { include: { options: true } },
          staff: { select: { name: true } },
          shop: { select: { name: true } },
        },
      });
      if (booking) return <StaffVerifyPanel booking={booking} />;
    }
    if (qr.type === "QUEUE" && qr.queueToken) {
      redirect(`/dashboard/queue?token=${qr.queueToken.id}`);
    }
  }

  redirect(buyerDestination(qr));
}
