import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/tenancy";
import { getT } from "@/lib/i18n";
import { AGE_BRACKETS, ageBracket } from "@/lib/analytics";
import { Card } from "@/components/ui";
import { BarRows } from "@/components/bar-chart";

export const dynamic = "force-dynamic";

export default async function DemographicsPage() {
  await requireAdminPage();
  const { t } = await getT();

  const [withDob, total] = await Promise.all([
    db.user.findMany({
      where: { role: "CUSTOMER", dateOfBirth: { not: null } },
      select: { dateOfBirth: true },
    }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ]);

  const counts = new Map(AGE_BRACKETS.map((b) => [b, 0]));
  for (const row of withDob) {
    if (!row.dateOfBirth) continue;
    const bracket = ageBracket(row.dateOfBirth);
    counts.set(bracket, (counts.get(bracket) ?? 0) + 1);
  }

  const missing = total - withDob.length;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("an.demographics")}</h2>

      {withDob.length === 0 ? (
        <Card className="p-6 text-sm">
          {/* Age is never inferred from behaviour and presented as fact. */}
          {t("an.noDob")} — {missing} of {total} customers.
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <BarRows
              data={AGE_BRACKETS.map((b) => ({ label: b, value: counts.get(b) ?? 0 }))}
              format={(v) => String(v)}
            />
          </Card>
          <p className="muted text-xs">
            Based on {withDob.length} self-reported dates of birth. {missing} customers have none on
            file.
          </p>
        </>
      )}
    </div>
  );
}
