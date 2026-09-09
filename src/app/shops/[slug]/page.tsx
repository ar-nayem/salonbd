import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Phone, BadgeCheck, Clock, Scissors, MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PUBLIC_SERVICE_WHERE } from "@/lib/constants";
import { getT } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { isOpenNow } from "@/lib/availability";
import { formatNumber, formatTaka, initials, minToTime, todayISO } from "@/lib/utils";
import { Badge, Card, LinkButton, SectionTitle } from "@/components/ui";
import { Rating, StarRow } from "@/components/rating";
import { FavoriteButton } from "@/components/favorite-button";
import { QueuePanel } from "@/components/queue-panel";
import { HelpfulButton } from "@/components/booking-actions";

export const dynamic = "force-dynamic";

const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await db.shop.findUnique({ where: { slug }, select: { name: true, area: true, city: true } });
  if (!shop) return { title: "Shop" };
  return {
    title: shop.name,
    description: `Book an appointment at ${shop.name}, ${shop.area}, ${shop.city}.`,
  };
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { locale, t } = await getT();
  const user = await getCurrentUser();

  const shop = await db.shop.findUnique({
    where: { slug },
    include: {
      services: { where: PUBLIC_SERVICE_WHERE, orderBy: [{ sort: "asc" }, { price: "asc" }] },
      staff: { where: { isActive: true }, orderBy: { sort: "asc" } },
      hours: { orderBy: { weekday: "asc" } },
      images: { orderBy: { sort: "asc" } },
      reviews: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: { select: { id: true, name: true, avatarUrl: true } },
          staff: { select: { name: true } },
          photos: true,
          tags: true,
          _count: { select: { votes: true } },
        },
      },
    },
  });

  if (!shop || shop.status !== "ACTIVE" || !shop.isActive) notFound();

  const [favorite, queue, myVotes] = await Promise.all([
    user
      ? db.favorite.findUnique({ where: { userId_shopId: { userId: user.id, shopId: shop.id } } })
      : null,
    shop.queueEnabled
      ? db.queueToken.findMany({
          where: { shopId: shop.id, date: todayISO() },
          orderBy: { number: "asc" },
          select: { number: true, status: true },
        })
      : [],
    user
      ? db.reviewVote.findMany({ where: { userId: user.id }, select: { reviewId: true } })
      : Promise.resolve([]),
  ]);
  const votedIds = new Set(myVotes.map((v) => v.reviewId));

  const name = locale === "bn" && shop.nameBn ? shop.nameBn : shop.name;
  const about = locale === "bn" && shop.aboutBn ? shop.aboutBn : shop.about;
  const open = isOpenNow(shop.hours);
  const days = locale === "bn" ? DAYS_BN : DAYS_EN;

  const serving = queue.find((q) => q.status === "SERVING")?.number ?? null;
  const waiting = queue.filter((q) => q.status === "WAITING").length;

  const byCategory = shop.services.reduce<Record<string, typeof shop.services>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="relative overflow-hidden rounded-3xl bg-ink-100 dark:bg-ink-800">
        <div className="aspect-[16/7] w-full">
          {shop.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shop.coverUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-400">
              <Scissors size={40} />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            {shop.isVerified ? (
              <Badge tone="green">
                <BadgeCheck size={13} /> {t("shop.verified")}
              </Badge>
            ) : null}
            <Badge tone={open ? "green" : "neutral"}>
              {open ? t("shop.open") : t("shop.closedNow")}
            </Badge>
          </div>
          <Rating value={shop.ratingAvg} count={shop.reviewCount} size={16} />
          <p className="muted flex items-center gap-1.5 text-sm">
            <MapPin size={14} /> {shop.address}, {shop.area}, {shop.city}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${shop.phone}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
          >
            <Phone size={16} /> {t("shop.callShop")}
          </a>
          {shop.lat && shop.lng ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium"
            >
              <MapPin size={16} /> {t("shop.directions")}
            </a>
          ) : null}
          <FavoriteButton shopId={shop.id} initial={Boolean(favorite)} loggedIn={Boolean(user)} />
          <LinkButton href={`/shops/${shop.slug}/book`} size="md" className="hidden md:inline-flex">
            {t("shop.bookNow")}
          </LinkButton>
        </div>
      </div>

      {shop.queueEnabled ? <QueuePanel shopId={shop.id} serving={serving} waiting={waiting} /> : null}

      {about ? (
        <Card className="p-5">
          <SectionTitle title={t("shop.about")} />
          <p className="muted whitespace-pre-line text-sm leading-relaxed">{about}</p>
        </Card>
      ) : null}

      <section>
        <SectionTitle title={t("shop.services")} />
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, list]) => (
            <div key={category}>
              <p className="muted mb-2 text-xs font-semibold uppercase tracking-wide">{t(`cat.${category}`)}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((s) => (
                  <Card key={s.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {locale === "bn" && s.nameBn ? s.nameBn : s.name}
                      </p>
                      <p className="muted mt-0.5 flex items-center gap-1.5 text-xs">
                        <Clock size={12} /> {formatNumber(s.durationMin, locale)} {t("book.min")}
                        {s.description ? <span className="truncate">· {s.description}</span> : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold">{formatTaka(s.price, locale)}</span>
                      <LinkButton
                        href={`/shops/${shop.slug}/book?service=${s.id}`}
                        size="sm"
                        variant="outline"
                      >
                        {t("shop.bookNow")}
                      </LinkButton>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          {shop.services.length === 0 ? (
            <p className="muted text-sm">{t("common.none")}</p>
          ) : null}
        </div>
      </section>

      {shop.staff.length > 0 ? (
        <section>
          <SectionTitle title={t("shop.team")} />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {shop.staff.map((s) => (
              <Card key={s.id} className="min-w-[10rem] p-4 text-center">
                <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt={s.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-sm font-semibold">
                      {initials(s.name)}
                    </span>
                  )}
                </div>
                <p className="truncate font-medium">{s.name}</p>
                {s.title ? <p className="muted truncate text-xs">{s.title}</p> : null}
                <div className="mt-1 flex justify-center">
                  <Rating value={s.ratingAvg} count={s.reviewCount} size={12} />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {shop.images.length > 0 ? (
        <section>
          <SectionTitle title={t("shop.gallery")} />
          <div className="grid grid-cols-3 gap-2 md:grid-cols-5">
            {shop.images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={img.caption ?? name}
                className="aspect-square w-full rounded-xl object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title={t("shop.hours")} />
          <ul className="space-y-1.5 text-sm">
            {days.map((label, weekday) => {
              const row = shop.hours.find((h) => h.weekday === weekday);
              return (
                <li key={weekday} className="flex justify-between">
                  <span>{label}</span>
                  <span className="muted">
                    {!row || row.isClosed
                      ? t("shop.closed")
                      : `${minToTime(row.openMin, locale)} – ${minToTime(row.closeMin, locale)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle title={t("shop.reviews")} />
          {shop.reviews.length === 0 ? (
            <p className="muted text-sm">{t("shop.noReviews")}</p>
          ) : (
            <ul className="space-y-4">
              {shop.reviews.map((r) => (
                <li key={r.id} className="border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{r.customer.name}</p>
                    <StarRow value={r.rating} size={13} />
                  </div>
                  {r.staff ? <p className="muted text-xs">{r.staff.name}</p> : null}
                  {r.comment ? <p className="mt-1 text-sm">{r.comment}</p> : null}

                  {r.tags.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded-full bg-black/[.05] px-2 py-0.5 text-[11px] dark:bg-white/[.08]"
                        >
                          {t(`tag.${tag.tag}`)}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {r.photos.length > 0 ? (
                    <div className="mt-2 flex gap-2">
                      {r.photos.map((photo) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={photo.id}
                          src={photo.url}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2">
                    <HelpfulButton
                      reviewId={r.id}
                      initialCount={r._count.votes}
                      initialVoted={votedIds.has(r.id)}
                    />
                  </div>

                  {r.reply ? (
                    <p className="muted mt-2 flex gap-2 rounded-xl bg-black/[.03] p-2 text-xs dark:bg-white/[.05]">
                      <MessageSquare size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <span className="font-medium">{t("shop.replyFromShop")}:</span> {r.reply}
                      </span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-[var(--card)] p-3 md:hidden">
        <Link
          href={`/shops/${shop.slug}/book`}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white"
        >
          {t("shop.bookNow")}
        </Link>
      </div>
    </div>
  );
}
