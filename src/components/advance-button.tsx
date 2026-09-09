"use client";

import type { BookingStatus, Fulfilment } from "@prisma/client";
import { nextStatus } from "@/lib/status";
import { useI18n } from "./locale-provider";
import { Button } from "./ui";

/**
 * The only "move this booking on" control in the app. Label and target both
 * come from the shared status map, so no surface can invent a jump.
 */
export function AdvanceButton({
  status,
  fulfilment,
  action,
  bookingId,
  size = "sm",
}: {
  status: BookingStatus;
  fulfilment: Fulfilment;
  action: (formData: FormData) => void;
  bookingId: string;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useI18n();
  const step = nextStatus(status, fulfilment);
  if (!step) return null;

  return (
    <form action={action}>
      <input type="hidden" name="id" value={bookingId} />
      <input type="hidden" name="to" value={step.next} />
      <Button size={size} type="submit">
        {t(step.labelKey)}
      </Button>
    </form>
  );
}

export function CloseBookingButtons({
  action,
  bookingId,
}: {
  action: (formData: FormData) => void;
  bookingId: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2">
      <form action={action}>
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="status" value="NO_SHOW" />
        <Button size="sm" variant="outline" type="submit">
          {t("status.NO_SHOW")}
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="id" value={bookingId} />
        <input type="hidden" name="status" value="CANCELLED" />
        <Button size="sm" variant="ghost" type="submit" className="text-red-600">
          {t("status.CANCELLED")}
        </Button>
      </form>
    </div>
  );
}
