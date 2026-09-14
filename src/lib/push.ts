import "server-only";
import webpush from "web-push";
import { db } from "./db";

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    configured = false;
    return false;
  }
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:admin@salonbd.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

export type PushResult = { sent: number; removed: number; failed: number };

/**
 * Sends to every browser the person has turned reminders on in. A 404/410
 * means that subscription is gone for good, so it is deleted; other failures
 * are counted and the row is dropped after repeated misses.
 */
export async function pushToUser(userId: string, payload: PushPayload): Promise<PushResult> {
  const result: PushResult = { sent: 0, removed: 0, failed: 0 };
  if (!pushConfigured()) return result;

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 6, urgency: "high" },
        );
        result.sent += 1;
        await db.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date(), failures: 0 },
        });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          result.removed += 1;
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          return;
        }
        result.failed += 1;
        // Log the real failure — a swallowed error makes a broken integration
        // look like "nobody has subscribed" forever.
        console.error("[push] send failed", status ?? "", (err as Error).message);
        const failures = sub.failures + 1;
        if (failures >= 5) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          await db.pushSubscription.update({ where: { id: sub.id }, data: { failures } }).catch(() => {});
        }
      }
    }),
  );

  return result;
}
