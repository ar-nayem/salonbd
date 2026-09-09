import { EmptyState, LinkButton } from "@/components/ui";
import { getT } from "@/lib/i18n";
import { SearchX } from "lucide-react";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="py-20">
      <EmptyState
        icon={<SearchX size={30} />}
        title="404"
        body={t("search.noResults")}
        action={<LinkButton href="/">{t("nav.home")}</LinkButton>}
      />
    </div>
  );
}
