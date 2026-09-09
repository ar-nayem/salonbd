"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { Button, Card } from "./ui";
import { useI18n } from "./locale-provider";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  side: "CUSTOMER" | "SHOP";
  type: "TEXT" | "IMAGE";
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
  mine: boolean;
};

export function MessageThread({ bookingId, title }: { bookingId: string; title?: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [sending, startSend] = useTransition();
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/bookings/${bookingId}/messages`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  useEffect(() => {
    load();
    // Short-interval polling stands in for a realtime transport.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  function send() {
    if (!text.trim() && !preview) return;
    setError("");
    startSend(async () => {
      let imageUrl: string | null = null;
      if (preview) {
        const form = new FormData();
        form.append("file", preview.file);
        const upload = await fetch("/api/uploads", { method: "POST", body: form });
        const uploaded = await upload.json();
        if (!upload.ok) {
          setError(uploaded.error === "TOO_LARGE" ? "Image is too large (max 5 MB)." : t("common.error"));
          return;
        }
        imageUrl = uploaded.url;
      }

      const res = await fetch(`/api/bookings/${bookingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          imageUrl ? { type: "IMAGE", imageUrl, body: text.trim() || undefined } : { type: "TEXT", body: text.trim() },
        ),
      });
      if (!res.ok) {
        setError(t("common.error"));
        return;
      }
      setText("");
      if (preview) URL.revokeObjectURL(preview.url);
      setPreview(null);
      load();
    });
  }

  return (
    <Card className="flex max-h-[32rem] flex-col p-0">
      <div className="border-b p-3 text-sm font-semibold">{title ?? t("msg.title")}</div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="muted py-6 text-center text-sm">{t("msg.empty")}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.mine ? "bg-brand-600 text-white" : "bg-black/[.05] dark:bg-white/[.08]",
                )}
              >
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" className="mb-1 max-h-56 rounded-xl object-cover" />
                ) : null}
                {m.body ? <p className="whitespace-pre-wrap">{m.body}</p> : null}
                <p className={cn("mt-0.5 text-[10px]", m.mine ? "text-white/70" : "muted")}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {preview ? (
        <div className="flex items-center gap-2 border-t p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
          <span className="muted flex-1 text-xs">{preview.file.name}</span>
          <button
            onClick={() => {
              URL.revokeObjectURL(preview.url);
              setPreview(null);
            }}
            className="muted"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {error ? <p className="px-3 pb-1 text-xs text-red-600">{error}</p> : null}

      <div className="flex items-center gap-2 border-t p-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview({ file, url: URL.createObjectURL(file) });
            e.target.value = "";
          }}
        />
        <button onClick={() => fileRef.current?.click()} className="muted p-2" aria-label={t("msg.photo")}>
          <ImagePlus size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("msg.placeholder")}
          className="h-10 flex-1 rounded-xl border bg-transparent px-3 text-sm outline-none"
        />
        <Button size="sm" onClick={send} disabled={sending || (!text.trim() && !preview)}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </Button>
      </div>
    </Card>
  );
}
