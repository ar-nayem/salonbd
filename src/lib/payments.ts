import "server-only";
import { randomUUID } from "crypto";
import { db } from "./db";

export type Provider = "MOCK" | "SSLCOMMERZ" | "BKASH";

export function activeProvider(): Provider {
  const p = (process.env.PAYMENT_PROVIDER || "MOCK").toUpperCase();
  return p === "SSLCOMMERZ" || p === "BKASH" ? p : "MOCK";
}

export function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

type InitInput = {
  bookingId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shopName: string;
};

export type InitResult = { redirectUrl: string; reference: string; provider: Provider };

/** Creates a Payment row and returns where to send the customer. */
export async function initPayment(input: InitInput): Promise<InitResult> {
  const provider = activeProvider();
  const reference = `SBP-${Date.now()}-${randomUUID().slice(0, 8)}`;

  await db.payment.create({
    data: {
      bookingId: input.bookingId,
      provider,
      amount: input.amount,
      status: "INITIATED",
      reference,
    },
  });

  if (provider === "SSLCOMMERZ") {
    const redirectUrl = await initSslcommerz(input, reference);
    return { redirectUrl, reference, provider };
  }
  if (provider === "BKASH") {
    const redirectUrl = await initBkash(input, reference);
    return { redirectUrl, reference, provider };
  }
  return { redirectUrl: `${appUrl()}/pay/mock/${reference}`, reference, provider };
}

// ---------------- SSLCommerz (covers bKash, Nagad, Rocket and cards) ----------------

function sslczBase() {
  return process.env.SSLCZ_SANDBOX === "false"
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";
}

async function initSslcommerz(input: InitInput, reference: string): Promise<string> {
  const body = new URLSearchParams({
    store_id: process.env.SSLCZ_STORE_ID || "",
    store_passwd: process.env.SSLCZ_STORE_PASSWORD || "",
    total_amount: String(input.amount),
    currency: "BDT",
    tran_id: reference,
    success_url: `${appUrl()}/api/payments/sslcommerz/callback?status=success`,
    fail_url: `${appUrl()}/api/payments/sslcommerz/callback?status=fail`,
    cancel_url: `${appUrl()}/api/payments/sslcommerz/callback?status=cancel`,
    ipn_url: `${appUrl()}/api/payments/sslcommerz/ipn`,
    cus_name: input.customerName,
    cus_email: input.customerEmail || "noreply@salonbd.app",
    cus_phone: input.customerPhone,
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    product_name: `Appointment at ${input.shopName}`,
    product_category: "Service",
    product_profile: "general",
  });

  const res = await fetch(`${sslczBase()}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as { GatewayPageURL?: string; failedreason?: string };
  if (!data.GatewayPageURL) {
    throw new Error(`SSLCommerz init failed: ${data.failedreason ?? "unknown"}`);
  }
  return data.GatewayPageURL;
}

export async function validateSslcommerz(valId: string) {
  const params = new URLSearchParams({
    val_id: valId,
    store_id: process.env.SSLCZ_STORE_ID || "",
    store_passwd: process.env.SSLCZ_STORE_PASSWORD || "",
    format: "json",
  });
  const res = await fetch(`${sslczBase()}/validator/api/validationserverAPI.php?${params}`);
  const data = (await res.json()) as {
    status?: string;
    tran_id?: string;
    amount?: string;
    bank_tran_id?: string;
    card_type?: string;
  };
  const ok = data.status === "VALID" || data.status === "VALIDATED";
  return {
    ok,
    reference: data.tran_id ?? "",
    amount: Number(data.amount ?? 0),
    trxId: data.bank_tran_id ?? valId,
    raw: data,
  };
}

// ---------------- bKash tokenized checkout ----------------

function bkashBase() {
  return process.env.BKASH_SANDBOX === "false"
    ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
    : "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
}

let bkashToken: { token: string; expiresAt: number } | null = null;

async function bkashGrantToken(): Promise<string> {
  if (bkashToken && bkashToken.expiresAt > Date.now() + 30_000) return bkashToken.token;
  const res = await fetch(`${bkashBase()}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: process.env.BKASH_USERNAME || "",
      password: process.env.BKASH_PASSWORD || "",
    },
    body: JSON.stringify({
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    }),
  });
  const data = (await res.json()) as { id_token?: string; expires_in?: number; statusMessage?: string };
  if (!data.id_token) throw new Error(`bKash token failed: ${data.statusMessage ?? "unknown"}`);
  bkashToken = { token: data.id_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.id_token;
}

async function initBkash(input: InitInput, reference: string): Promise<string> {
  const token = await bkashGrantToken();
  const res = await fetch(`${bkashBase()}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": process.env.BKASH_APP_KEY || "",
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: input.customerPhone,
      callbackURL: `${appUrl()}/api/payments/bkash/callback`,
      amount: String(input.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: reference,
    }),
  });
  const data = (await res.json()) as {
    bkashURL?: string;
    paymentID?: string;
    statusMessage?: string;
  };
  if (!data.bkashURL) throw new Error(`bKash create failed: ${data.statusMessage ?? "unknown"}`);

  await db.payment.update({
    where: { reference },
    data: { payload: JSON.stringify({ paymentID: data.paymentID }) },
  });
  return data.bkashURL;
}

export async function executeBkash(paymentID: string) {
  const token = await bkashGrantToken();
  const res = await fetch(`${bkashBase()}/tokenized/checkout/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": process.env.BKASH_APP_KEY || "",
    },
    body: JSON.stringify({ paymentID }),
  });
  const data = (await res.json()) as {
    transactionStatus?: string;
    trxID?: string;
    amount?: string;
    merchantInvoiceNumber?: string;
    statusMessage?: string;
  };
  return {
    ok: data.transactionStatus === "Completed",
    trxId: data.trxID ?? "",
    amount: Number(data.amount ?? 0),
    reference: data.merchantInvoiceNumber ?? "",
    raw: data,
  };
}

// ---------------- Shared settlement ----------------

/** Marks a payment successful and moves the booking forward. Idempotent. */
export async function settlePayment(opts: {
  reference: string;
  trxId: string;
  amount: number;
  raw?: unknown;
}) {
  const payment = await db.payment.findUnique({
    where: { reference: opts.reference },
    include: { booking: true },
  });
  if (!payment) return { ok: false, reason: "PAYMENT_NOT_FOUND" as const };
  if (payment.status === "SUCCESS") {
    return { ok: true, bookingId: payment.bookingId, alreadyDone: true };
  }
  if (opts.amount && Math.round(opts.amount) !== payment.amount) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", payload: JSON.stringify(opts.raw ?? {}) },
    });
    return { ok: false, reason: "AMOUNT_MISMATCH" as const };
  }

  const booking = payment.booking;
  const paid = booking.amountPaid + payment.amount;

  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCESS", trxId: opts.trxId, payload: JSON.stringify(opts.raw ?? {}) },
    }),
    db.booking.update({
      where: { id: booking.id },
      data: {
        amountPaid: paid,
        dueAtShop: Math.max(booking.total - paid, 0),
        paymentStatus: paid >= booking.total ? "PAID" : "DEPOSIT_PAID",
        status: booking.status === "PENDING" ? "CONFIRMED" : booking.status,
      },
    }),
    db.notification.create({
      data: {
        userId: booking.customerId,
        title: "Payment received",
        body: `৳${payment.amount} received for booking ${booking.code}.`,
        href: `/bookings/${booking.id}`,
      },
    }),
  ]);

  return { ok: true, bookingId: booking.id, alreadyDone: false };
}

export async function failPayment(reference: string, raw?: unknown) {
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment || payment.status === "SUCCESS") return;
  await db.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", payload: JSON.stringify(raw ?? {}) },
  });
  await db.booking.update({
    where: { id: payment.bookingId },
    data: { paymentStatus: "FAILED" },
  });
}
