import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatTaka, todayISO } from "@/lib/utils";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { generatePayouts, markPayoutPaid } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPayouts() {
  const { locale, t } = await getT();
  const payouts = await db.payout.findMany({
    orderBy: { createdAt: "desc" },
    include: { shop: { select: { name: true } } },
    take: 100,
  });

  const monthStart = todayISO().slice(0, 8) + "01";

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form action={generatePayouts} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" name="periodStart" defaultValue={monthStart} required />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" name="periodEnd" defaultValue={todayISO()} required />
          </div>
          <Button type="submit">Generate</Button>
        </form>
        <p className="muted mt-2 text-xs">
          Sums completed bookings per shop and applies that shop&apos;s commission rate.
        </p>
      </Card>

      <div className="space-y-2">
        {payouts.map((p) => (
          <Card key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{p.shop.name}</p>
              <p className="muted text-sm">
                {p.periodStart} → {p.periodEnd} · gross {formatTaka(p.gross, locale)} · fee{" "}
                {formatTaka(p.commission, locale)}
              </p>
            </div>
            <p className="font-semibold">{formatTaka(p.net, locale)}</p>
            <Badge tone={p.status === "PAID" ? "green" : "amber"}>{p.status}</Badge>
            {p.status === "PENDING" ? (
              <form action={markPayoutPaid} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <Input name="note" placeholder="bKash trx id" className="h-9 w-40" />
                <Button size="sm" type="submit">
                  Mark paid
                </Button>
              </form>
            ) : null}
          </Card>
        ))}
        {payouts.length === 0 ? <p className="muted text-sm">{t("common.none")}</p> : null}
      </div>
    </div>
  );
}
