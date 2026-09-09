import { NextResponse } from "next/server";
import { appUrl, executeBkash, failPayment, settlePayment } from "@/lib/payments";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const paymentID = url.searchParams.get("paymentID") || "";

  const payment = await db.payment.findFirst({
    where: { provider: "BKASH", payload: { contains: paymentID } },
  });

  if (status !== "success" || !paymentID) {
    if (payment?.reference) await failPayment(payment.reference, { status, paymentID });
    return NextResponse.redirect(
      `${appUrl()}${payment ? `/bookings/${payment.bookingId}?payment=failed` : "/bookings?payment=failed"}`,
      { status: 303 },
    );
  }

  const result = await executeBkash(paymentID);
  if (!result.ok) {
    if (payment?.reference) await failPayment(payment.reference, result.raw);
    return NextResponse.redirect(
      `${appUrl()}${payment ? `/bookings/${payment.bookingId}?payment=failed` : "/bookings?payment=failed"}`,
      { status: 303 },
    );
  }

  const settled = await settlePayment({
    reference: result.reference,
    trxId: result.trxId,
    amount: result.amount,
    raw: result.raw,
  });

  return NextResponse.redirect(
    settled.ok && "bookingId" in settled
      ? `${appUrl()}/bookings/${settled.bookingId}?payment=success`
      : `${appUrl()}/bookings?payment=failed`,
    { status: 303 },
  );
}
