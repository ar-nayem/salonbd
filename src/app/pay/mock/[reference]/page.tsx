import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { activeProvider } from "@/lib/payments";
import { formatTaka } from "@/lib/utils";
import { getT } from "@/lib/i18n";
import { Card } from "@/components/ui";
import { MockPayActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function MockPayPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const { locale } = await getT();
  const user = await getCurrentUser();
  if (activeProvider() !== "MOCK") notFound();

  const payment = await db.payment.findUnique({
    where: { reference },
    include: { booking: { include: { shop: { select: { name: true } } } } },
  });
  if (!payment || !user || payment.booking.customerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-md py-8">
      <Card className="p-6">
        <p className="muted text-xs uppercase tracking-wide">Sandbox gateway</p>
        <h1 className="mt-1 text-xl font-bold">{payment.booking.shop.name}</h1>
        <p className="muted mt-1 text-sm">Booking {payment.booking.code}</p>

        <p className="my-6 text-center text-4xl font-bold">{formatTaka(payment.amount, locale)}</p>

        <p className="muted mb-4 text-center text-xs">
          No real gateway is configured. Set PAYMENT_PROVIDER to SSLCOMMERZ or BKASH in .env to take
          live payments.
        </p>

        <MockPayActions reference={reference} bookingId={payment.bookingId} />
      </Card>
    </div>
  );
}
