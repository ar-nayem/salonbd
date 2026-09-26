"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button, Card, Input, Label } from "./ui";
import { useI18n } from "./locale-provider";

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const errors: Record<string, string> = {
    OWNS_SHOP: t("del.ownsShop"),
    IS_STAFF: t("del.isStaff"),
    WRONG_PASSWORD: t("del.wrongPassword"),
    PASSWORD_REQUIRED: t("del.wrongPassword"),
    CONFIRM_REQUIRED: t("del.confirmRequired"),
    TOO_MANY_REQUESTS: t("auth.tooMany"),
  };

  return (
    <Card className="space-y-3 border-red-200 p-5 dark:border-red-900">
      <p className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
        <TriangleAlert size={16} /> {t("del.title")}
      </p>
      <p className="muted whitespace-pre-line text-sm">{t("del.what")}</p>

      {hasPassword ? (
        <div>
          <Label>{t("auth.password")}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      ) : null}

      <div>
        <Label>{t("del.typeDelete")}</Label>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button
        variant="danger"
        disabled={pending || confirm.trim().toUpperCase() !== "DELETE"}
        onClick={() =>
          start(async () => {
            setError("");
            const res = await fetch("/api/account/delete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ confirm, password: password || undefined }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(errors[data.error] ?? t("common.error"));
              return;
            }
            router.push("/?deleted=1");
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : null}
        {t("del.confirmButton")}
      </Button>
    </Card>
  );
}
