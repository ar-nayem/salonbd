import { NextResponse } from "next/server";
import { failPayment, settlePayment, validateSslcommerz } from "@/lib/payments";

/** Server-to-server notification. The redirect callback may never fire, so settle here too. */
export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const valId = form.get("val_id");
  const tranId = form.get("tran_id") || "";
  if (!valId) return NextResponse.json({ ok: false }, { status: 400 });

  const check = await validateSslcommerz(valId);
  if (!check.ok) {
    await failPayment(tranId, check.raw);
    return NextResponse.json({ ok: false });
  }
  await settlePayment({
    reference: check.reference || tranId,
    trxId: check.trxId,
    amount: check.amount,
    raw: check.raw,
  });
  return NextResponse.json({ ok: true });
}
