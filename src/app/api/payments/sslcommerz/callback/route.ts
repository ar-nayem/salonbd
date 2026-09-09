import { NextResponse } from "next/server";
import { appUrl, failPayment, settlePayment, validateSslcommerz } from "@/lib/payments";
import { db } from "@/lib/db";

async function handle(form: URLSearchParams, status: string | null) {
  const tranId = form.get("tran_id") || "";
  const valId = form.get("val_id") || "";

  if (status !== "success" || !valId) {
    if (tranId) await failPayment(tranId, Object.fromEntries(form));
    const payment = tranId ? await db.payment.findUnique({ where: { reference: tranId } }) : null;
    return NextResponse.redirect(
      `${appUrl()}${payment ? `/bookings/${payment.bookingId}?payment=failed` : "/bookings?payment=failed"}`,
      { status: 303 },
    );
  }

  const check = await validateSslcommerz(valId);
  if (!check.ok) {
    await failPayment(tranId, check.raw);
    return NextResponse.redirect(`${appUrl()}/bookings?payment=failed`, { status: 303 });
  }

  const result = await settlePayment({
    reference: check.reference || tranId,
    trxId: check.trxId,
    amount: check.amount,
    raw: check.raw,
  });

  return NextResponse.redirect(
    result.ok && "bookingId" in result
      ? `${appUrl()}/bookings/${result.bookingId}?payment=success`
      : `${appUrl()}/bookings?payment=failed`,
    { status: 303 },
  );
}

export async function POST(req: Request) {
  const status = new URL(req.url).searchParams.get("status");
  const form = new URLSearchParams(await req.text());
  return handle(form, status);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return handle(url.searchParams, url.searchParams.get("status"));
}
