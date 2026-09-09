import "server-only";
import { randomInt, createHash } from "crypto";
import { db } from "./db";
import { getEmailSender, getSmsSender } from "./notifications";
import { rateLimit } from "./ratelimit";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(destination: string, code: string) {
  // Salted with the destination so a stolen hash cannot be replayed elsewhere.
  return createHash("sha256").update(`${destination}:${code}`).digest("hex");
}

export type RequestCodeResult =
  | { ok: true; delivered: true }
  | { ok: false; error: "RATE_LIMITED" | "NOT_DELIVERED"; detail?: string };

/**
 * Issues a 6-digit code. The code itself is never stored and never returned —
 * read it from the server log while a real provider is not configured.
 */
export async function requestCode(
  destination: string,
  channel: "EMAIL" | "SMS",
): Promise<RequestCodeResult> {
  const limit = rateLimit(`otp:${channel}:${destination}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { ok: false, error: "RATE_LIMITED" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // Reissuing invalidates anything still outstanding for this destination.
  await db.otpCode.updateMany({
    where: { destination, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await db.otpCode.create({
    data: {
      destination,
      channel,
      codeHash: hashCode(destination, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  const text = `Your SalonBD code is ${code}. It expires in 5 minutes.`;
  const result =
    channel === "EMAIL"
      ? await getEmailSender().send({ to: destination, subject: "SalonBD login code", text })
      : await getSmsSender().send({ to: destination, text });

  if (!result.ok) {
    // Do not tell someone to check an inbox that will never receive anything.
    return { ok: false, error: "NOT_DELIVERED", detail: result.error };
  }
  return { ok: true, delivered: true };
}

export type VerifyResult = { ok: true } | { ok: false; error: "INVALID" | "EXPIRED" | "LOCKED" };

export async function verifyCode(destination: string, code: string): Promise<VerifyResult> {
  const record = await db.otpCode.findFirst({
    where: { destination, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false, error: "INVALID" };
  if (record.expiresAt < new Date()) return { ok: false, error: "EXPIRED" };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, error: "LOCKED" };

  if (record.codeHash !== hashCode(destination, code)) {
    const attempts = record.attempts + 1;
    await db.otpCode.update({
      where: { id: record.id },
      data: {
        attempts,
        // Burn the code once someone has guessed too often.
        consumedAt: attempts >= MAX_ATTEMPTS ? new Date() : null,
      },
    });
    return { ok: false, error: attempts >= MAX_ATTEMPTS ? "LOCKED" : "INVALID" };
  }

  await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
