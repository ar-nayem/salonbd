import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { Button, Card, EmptyState, Textarea } from "@/components/ui";
import { StarRow } from "@/components/rating";
import { replyToReview } from "../actions";

export const dynamic = "force-dynamic";

export default async function DashboardReviews() {
  const { shopId } = await requireShopPage();
  const { t } = await getT();

  const reviews = await db.review.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } }, staff: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("dash.reviews")}</h1>

      {reviews.length === 0 ? (
        <EmptyState title={t("shop.noReviews")} />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{r.customer.name}</p>
                <StarRow value={r.rating} size={14} />
              </div>
              {r.staff ? <p className="muted text-xs">{r.staff.name}</p> : null}
              {r.comment ? <p className="text-sm">{r.comment}</p> : null}
              <form action={replyToReview} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <Textarea
                  name="reply"
                  rows={2}
                  defaultValue={r.reply ?? ""}
                  placeholder={t("shop.replyFromShop")}
                />
                <Button size="sm" type="submit" variant="outline">
                  {t("common.save")}
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
