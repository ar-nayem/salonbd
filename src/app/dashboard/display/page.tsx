import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { minToTime, todayISO } from "@/lib/utils";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

/** Big type for a screen mounted on the wall. Minimal chrome, auto-refreshing. */
export default async function DisplayPage() {
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();
  const date = todayISO();

  const [shop, bookings, queue] = await Promise.all([
    db.shop.findUnique({ where: { id: shopId }, select: { name: true, nameBn: true } }),
    db.booking.findMany({
      where: { shopId, date, status: { in: ["CONFIRMED", "ACCEPTED", "IN_PROGRESS", "READY"] } },
      orderBy: { startMin: "asc" },
      take: 12,
      include: { staff: { select: { name: true } } },
    }),
    db.queueToken.findMany({
      where: { shopId, date, status: { in: ["WAITING", "SERVING"] } },
      orderBy: { number: "asc" },
    }),
  ]);

  const serving = queue.find((q) => q.status === "SERVING");

  return (
    <div className="min-h-[80vh]">
      <AutoRefresh seconds={15} />

      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          {locale === "bn" && shop?.nameBn ? shop.nameBn : shop?.name}
        </h1>
        <p className="text-xl md:text-3xl">
          <span className="muted mr-3 text-base md:text-xl">{t("shop.queueNow")}</span>
          <span className="font-bold">{serving?.number ?? "—"}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <table className="w-full text-left">
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="py-4 text-2xl font-bold md:text-4xl">{minToTime(b.startMin, locale)}</td>
                  <td className="py-4 text-xl md:text-3xl">{b.customerName}</td>
                  <td className="muted py-4 text-lg md:text-2xl">{b.staff?.name ?? ""}</td>
                  <td className="py-4 text-right text-lg md:text-2xl">{t(`status.${b.status}`)}</td>
                </tr>
              ))}
              {bookings.length === 0 ? (
                <tr>
                  <td className="muted py-10 text-2xl">{t("bookings.empty")}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div>
          <p className="muted mb-3 text-lg uppercase tracking-wide">{t("shop.queue")}</p>
          <div className="flex flex-wrap gap-3">
            {queue.map((q) => (
              <span
                key={q.id}
                className={
                  q.status === "SERVING"
                    ? "grid h-20 w-20 place-items-center rounded-2xl bg-brand-600 text-3xl font-bold text-white"
                    : "grid h-20 w-20 place-items-center rounded-2xl border text-3xl font-bold"
                }
              >
                {q.number}
              </span>
            ))}
            {queue.length === 0 ? <p className="muted text-xl">—</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
