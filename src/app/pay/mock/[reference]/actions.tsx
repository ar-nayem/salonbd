"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";

export function MockPayActions({ reference, bookingId }: { reference: string; bookingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function send(outcome: "success" | "fail") {
    start(async () => {
      await fetch("/api/payments/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, outcome }),
      });
      router.push(`/bookings/${bookingId}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <Button size="lg" onClick={() => send("success")} disabled={pending}>
        Pay now
      </Button>
      <Button size="lg" variant="outline" onClick={() => send("fail")} disabled={pending}>
        Simulate failure
      </Button>
    </div>
  );
}
