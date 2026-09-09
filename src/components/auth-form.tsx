"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Store } from "lucide-react";
import { Button, Card, Input, Label } from "./ui";
import { useI18n } from "./locale-provider";

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "Wrong login or password.",
  PHONE_TAKEN: "This mobile number already has an account.",
  EMAIL_TAKEN: "This email already has an account.",
  INVALID_PHONE: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX).",
  PHONE_OR_EMAIL_REQUIRED: "Give a mobile number or an email.",
  TOO_MANY_REQUESTS: "Too many attempts. Try again later.",
  BLOCKED: "This account is blocked.",
};

export function AuthForm({
  mode,
  next,
  googleEnabled,
}: {
  mode: "login" | "signup";
  next: string;
  googleEnabled: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body =
        mode === "login"
          ? { identifier, password }
          : { name, phone, email, password, role: isOwner ? "OWNER" : "CUSTOMER" };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(ERRORS[data.error] ?? ERRORS[data.detail] ?? t("common.error"));
        return;
      }
      router.push(data.role === "OWNER" ? "/dashboard" : next);
      router.refresh();
    });
  }

  return (
    <Card className="mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold tracking-tight">
        {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
      </h1>

      {googleEnabled ? (
        <>
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}${isOwner ? "&role=OWNER" : ""}`}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition hover:bg-black/[.03]"
          >
            <GoogleMark /> {t("auth.google")}
          </a>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--line)]" />
            <span className="muted text-xs">{t("auth.or")}</span>
            <div className="h-px flex-1 bg-[var(--line)]" />
          </div>
        </>
      ) : null}

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" ? (
          <>
            <div>
              <Label>{t("auth.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <Label>{t("auth.phone")}</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <Label>{t("auth.emailOptional")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </>
        ) : (
          <div>
            <Label>{t("auth.phoneOrEmail")}</Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="01XXXXXXXXX"
            />
          </div>
        )}

        <div>
          <Label>{t("auth.password")}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {mode === "signup" ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm">
            <input
              type="checkbox"
              checked={isOwner}
              onChange={(e) => setIsOwner(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand-600)]"
            />
            <Store size={16} />
            {t("auth.asOwner")}
          </label>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {mode === "login" ? t("auth.submitLogin") : t("auth.submitSignup")}
        </Button>
      </form>

      <p className="muted text-center text-sm">
        {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-medium text-brand-600 hover:underline"
        >
          {mode === "login" ? t("nav.signup") : t("nav.login")}
        </Link>
      </p>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.8 2.6 13.6l7.8 6C12.3 13.9 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.4h12.6c-.3 2.1-1.6 5.2-4.7 7.3l7.2 5.6c4.3-4 6.9-9.9 6.9-16.2z" />
      <path fill="#FBBC05" d="M10.4 28.4a14.5 14.5 0 0 1 0-8.8l-7.8-6a24 24 0 0 0 0 20.8l7.8-6z" />
      <path fill="#34A853" d="M24 47.5c6.2 0 11.5-2 15.3-5.6l-7.2-5.6c-2 1.4-4.6 2.3-8.1 2.3-6.4 0-11.7-4.4-13.6-10.2l-7.8 6C6.5 42.2 14.6 47.5 24 47.5z" />
    </svg>
  );
}
