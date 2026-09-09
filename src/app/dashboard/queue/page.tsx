import { db } from "@/lib/db";
import { requireOwnerShopId } from "@/lib/owner";
import { getT } from "@/lib/i18n";
import { todayISO } from "@/lib/utils";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { addQueueToken, setQueueStatus } from "../actions";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const { shopId } = await requireOwnerShopId();
  const { t } = await getT();
  const date = todayISO();

  const [tokens, staff] = await Promise.all([
    db.queueToken.findMany({
      where: { shopId, date },
      orderBy: { number: "asc" },
      include: { staff: { select: { name: true } } },
    }),
    db.staff.findMany({ where: { shopId, isActive: true }, orderBy: { sort: "asc" } }),
  ]);

  const waiting = tokens.filter((x) => x.status === "WAITING");
  const serving = tokens.find((x) => x.status === "SERVING");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("dash.queue")}</h1>
        <p className="muted text-sm">
          {t("shop.queueNow")}: <span className="font-semibold">{serving?.number ?? "—"}</span> ·{" "}
          {waiting.length} {t("shop.queueWaiting")}
        </p>
      </div>

      <Card className="p-4">
        <form action={addQueueToken} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="shopId" value={shopId} />
          <div>
            <Label>{t("book.yourName")}</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>{t("book.yourPhone")}</Label>
            <Input name="phone" inputMode="numeric" />
          </div>
          <div>
            <Label>{t("dash.staff")}</Label>
            <Select name="staffId" defaultValue="">
              <option value="">{t("book.anyStaff")}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              {t("common.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {tokens.map((token) => (
          <Card key={token.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 font-bold dark:bg-ink-800">
              {token.number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{token.name}</p>
              <p className="muted truncate text-xs">
                {token.phone ?? "—"}
                {token.staff ? ` · ${token.staff.name}` : ""}
              </p>
            </div>
            <Badge
              tone={
                token.status === "SERVING"
                  ? "green"
                  : token.status === "WAITING"
                    ? "amber"
                    : "neutral"
              }
            >
              {token.status}
            </Badge>
            <div className="flex gap-2">
              {token.status !== "SERVING" && token.status !== "DONE" ? (
                <QueueAction id={token.id} status="SERVING" label="Call" />
              ) : null}
              {token.status !== "DONE" ? <QueueAction id={token.id} status="DONE" label="Done" variant="dark" /> : null}
              {token.status === "WAITING" ? (
                <QueueAction id={token.id} status="SKIPPED" label="Skip" variant="outline" />
              ) : null}
            </div>
          </Card>
        ))}
        {tokens.length === 0 ? <p className="muted text-sm">{t("common.none")}</p> : null}
      </div>
    </div>
  );
}

function QueueAction({
  id,
  status,
  label,
  variant = "primary",
}: {
  id: string;
  status: string;
  label: string;
  variant?: "primary" | "outline" | "dark";
}) {
  return (
    <form action={setQueueStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button size="sm" variant={variant} type="submit">
        {label}
      </Button>
    </form>
  );
}
