import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatTaka, minToTime } from "@/lib/utils";
import { Card } from "@/components/ui";
import { PaymentBadge, StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function AdminBookings() {
  const { locale } = await getT();
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { shop: { select: { name: true } }, customer: { select: { name: true } } },
  });

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead className="border-b text-left">
          <tr>
            <th className="p-3 font-medium">Code</th>
            <th className="p-3 font-medium">Shop</th>
            <th className="p-3 font-medium">Customer</th>
            <th className="p-3 font-medium">When</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="p-3 font-mono text-xs">{b.code}</td>
              <td className="p-3">{b.shop.name}</td>
              <td className="p-3">{b.customer.name}</td>
              <td className="p-3">
                {b.date} {minToTime(b.startMin)}
              </td>
              <td className="p-3">
                <div className="flex gap-1">
                  <StatusBadge status={b.status} />
                  <PaymentBadge status={b.paymentStatus} />
                </div>
              </td>
              <td className="p-3 text-right font-medium">{formatTaka(b.total, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
