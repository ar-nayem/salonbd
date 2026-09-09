"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, Loader2 } from "lucide-react";
import { Button, Card, Input } from "./ui";
import { useI18n } from "./locale-provider";

/**
 * Uses the platform barcode detector where it exists and falls back to jsQR
 * over a canvas frame. Manual entry is always available, because shop lighting
 * and cracked phone cameras are real.
 */
export function Scanner() {
  const { t } = useI18n();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "unavailable">("idle");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      setStatus("starting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setStatus("unavailable");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("scanning");

      const detector =
        "BarcodeDetector" in window
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new (window as any).BarcodeDetector({ formats: ["qr_code"] })
          : null;

      const tick = async () => {
        if (stopped || !videoRef.current) return;
        const canvas = canvasRef.current;
        const v = videoRef.current;

        if (v.readyState === v.HAVE_ENOUGH_DATA && canvas) {
          let value: string | null = null;
          if (detector) {
            try {
              const found = await detector.detect(v);
              value = found[0]?.rawValue ?? null;
            } catch {
              value = null;
            }
          } else {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              value = jsQR(image.data, image.width, image.height)?.data ?? null;
            }
          }

          if (value) {
            stopped = true;
            go(value);
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(value: string) {
    const token = value.includes("/q/") ? value.split("/q/")[1].split(/[?#]/)[0] : value.trim();
    if (token) router.push(`/q/${token}`);
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden p-0">
        <div className="relative aspect-square w-full bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          {status !== "scanning" ? (
            <div className="absolute inset-0 grid place-items-center text-white">
              {status === "unavailable" ? (
                <p className="px-6 text-center text-sm">{t("qr.noCamera")}</p>
              ) : (
                <Loader2 className="animate-spin" />
              )}
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/70" />
          )}
        </div>
      </Card>

      <Card className="space-y-2 p-3">
        <p className="text-sm font-medium">{t("qr.enterManually")}</p>
        <div className="flex gap-2">
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="token" />
          <Button onClick={() => go(manual)} disabled={!manual.trim()}>
            <Camera size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}
