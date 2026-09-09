import Link from "next/link";
import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { formatDateLabel, minToTime } from "@/lib/utils";
import { Badge, Card, EmptyState } from "@/components/ui";
import { MessageThread } from "@/components/message-thread";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const sp = await searchParams;
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();

  const conversations = await db.conversation.findMany({
    where: { shopId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      booking: {
        select: { id: true, code: true, customerName: true, date: true, startMin: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, type: true, senderSide: true },
      },
      _count: { select: { messages: true } },
    },
  });

  const unreadCounts = await db.message.groupBy({
    by: ["conversationId"],
    where: { conversation: { shopId }, senderSide: "CUSTOMER", readAt: null },
    _count: true,
  });

  // A shop can open a thread from a booking that has no conversation yet.
  const selectedId = sp.booking ?? conversations[0]?.booking.id ?? null;
  const selected = selectedId
    ? await db.booking.findFirst({
        where: { id: selectedId, shopId },
        select: { id: true, code: true, customerName: true },
      })
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t("msg.inbox")}</h1>

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <EmptyState title={t("msg.empty")} />
          ) : (
            conversations.map((c) => {
              const unread = unreadCounts.find((u) => u.conversationId === c.id)?._count ?? 0;
              const last = c.messages[0];
              return (
                <Link key={c.id} href={`/dashboard/messages?booking=${c.booking.id}`}>
                  <Card
                    className={
                      selectedId === c.booking.id
                        ? "border-brand-500 p-3 ring-2 ring-brand-500/20"
                        : "p-3"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.booking.customerName}</p>
                      {unread > 0 ? <Badge tone="green">{unread}</Badge> : null}
                    </div>
                    <p className="muted truncate text-xs">
                      {c.booking.code} · {formatDateLabel(c.booking.date, locale)} ·{" "}
                      {minToTime(c.booking.startMin, locale)}
                    </p>
                    {last ? (
                      <p className="muted mt-1 truncate text-xs">
                        {last.senderSide === "SHOP" ? `${t("msg.you")}: ` : ""}
                        {last.type === "IMAGE" ? t("msg.photo") : last.body}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              );
            })
          )}
        </div>

        <div>
          {selected ? (
            <MessageThread
              bookingId={selected.id}
              title={`${selected.customerName} · ${selected.code}`}
            />
          ) : (
            <EmptyState title={t("msg.empty")} />
          )}
        </div>
      </div>
    </div>
  );
}
