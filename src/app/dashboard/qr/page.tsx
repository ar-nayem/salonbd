import { db } from "@/lib/db";
import { requireShopPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { qrUrl } from "@/lib/qr";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { createQrCode, toggleQrCode } from "../actions";
import { PrintSheetButton } from "@/components/print-sheet";

export const dynamic = "force-dynamic";

const TYPES = ["SHOP", "CATALOG", "SERVICE", "STATION", "COUNTER", "PROMOTION", "LOCATION", "REGISTRATION"];

export default async function QrPage() {
  const { shopId } = await requireShopPage();
  const { locale, t } = await getT();

  const [codes, services, stations, promos] = await Promise.all([
    db.qrCode.findMany({
      where: { shopId },
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { name: true } },
        station: { select: { name: true } },
        promo: { select: { code: true } },
      },
    }),
    db.service.findMany({ where: { shopId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.station.findMany({ where: { shopId }, select: { id: true, name: true }, orderBy: { sort: "asc" } }),
    db.promo.findMany({ where: { shopId }, select: { id: true, code: true } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("qr.title")}</h1>
        <PrintSheetButton label={t("qr.printSheet")} />
      </div>

      <Card className="p-4">
        <form action={createQrCode} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>Type</Label>
            <Select name="type" defaultValue="SHOP">
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`qr.type.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("dash.services")}</Label>
            <Select name="serviceId" defaultValue="">
              <option value="">—</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("ops.stations")}</Label>
            <Select name="stationId" defaultValue="">
              <option value="">—</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("dash.promos")}</Label>
            <Select name="promoId" defaultValue="">
              <option value="">—</option>
              {promos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Label>Label</Label>
            <Input name="label" placeholder="Front window poster" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              {t("qr.generate")}
            </Button>
          </div>
        </form>
      </Card>

      <div id="print-sheet" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((code) => (
          <Card key={code.id} className="space-y-3 p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/qr/${code.token}/png?size=320`}
              alt={code.label ?? code.type}
              className="mx-auto h-40 w-40 rounded-xl bg-white p-2"
            />
            <div>
              <p className="font-medium">
                {code.label || t(`qr.type.${code.type}`)}
              </p>
              <p className="muted text-xs">
                {t(`qr.type.${code.type}`)}
                {code.service ? ` · ${code.service.name}` : ""}
                {code.station ? ` · ${code.station.name}` : ""}
                {code.promo ? ` · ${code.promo.code}` : ""}
              </p>
              <p className="muted mt-1 break-all text-[10px]">{qrUrl(code.token)}</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs">
              <Badge tone={code.isActive ? "green" : "neutral"}>
                {code.isActive ? t("common.active") : t("common.inactive")}
              </Badge>
              <span className="muted">
                {code.scanCount} {t("qr.scans")}
              </span>
            </div>
            <p className="muted text-[11px]">
              {t("qr.lastScan")}:{" "}
              {code.lastScannedAt
                ? new Date(code.lastScannedAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB")
                : t("qr.never")}
            </p>

            <div className="flex justify-center gap-2 print:hidden">
              <a
                href={`/api/qr/${code.token}/png?size=1024`}
                download={`salonbd-${code.token}.png`}
                className="inline-flex h-9 items-center rounded-xl border px-3 text-xs"
              >
                {t("qr.download")}
              </a>
              <form action={toggleQrCode}>
                <input type="hidden" name="id" value={code.id} />
                <Button size="sm" variant="ghost" type="submit">
                  {code.isActive ? t("qr.disable") : t("qr.enable")}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
