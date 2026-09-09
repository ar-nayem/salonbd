import "server-only";
import { db } from "./db";

/**
 * Every outbound channel sits behind one of these interfaces. Swapping a
 * provider means writing one file and changing one factory — nothing in the
 * booking or auth flows changes.
 */
export type DeliveryResult = { ok: true; id?: string } | { ok: false; error: string };

export interface EmailSender {
  readonly name: string;
  readonly isPlaceholder: boolean;
  send(input: { to: string; subject: string; text: string }): Promise<DeliveryResult>;
}

export interface SmsSender {
  readonly name: string;
  readonly isPlaceholder: boolean;
  send(input: { to: string; text: string }): Promise<DeliveryResult>;
}

/**
 * A placeholder that says so. It never reports a delivery that did not happen,
 * so callers can tell the user the truth instead of pointing them at an inbox
 * nothing will arrive in.
 */
const logEmail: EmailSender = {
  name: "log",
  isPlaceholder: true,
  async send({ to, subject, text }) {
    console.warn(
      `[email:PLACEHOLDER] nothing was delivered. to=${to} subject=${subject}\n${text}`,
    );
    return { ok: false, error: "NO_EMAIL_PROVIDER" };
  },
};

const logSms: SmsSender = {
  name: "log",
  isPlaceholder: true,
  async send({ to, text }) {
    console.warn(`[sms:PLACEHOLDER] nothing was delivered. to=${to}\n${text}`);
    return { ok: false, error: "NO_SMS_PROVIDER" };
  },
};

/** SMTP-less deployments keep the placeholder; wire a real sender here. */
export function getEmailSender(): EmailSender {
  return logEmail;
}

export function getSmsSender(): SmsSender {
  return logSms;
}

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
};

export interface NotificationService {
  send(input: NotificationInput): Promise<void>;
  sendMany(inputs: NotificationInput[]): Promise<void>;
}

/** Writes to the in-app inbox. Push/SMS fan-out plugs in here later. */
const dbNotifications: NotificationService = {
  async send(input) {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
      },
    });
  },
  async sendMany(inputs) {
    if (inputs.length === 0) return;
    await db.notification.createMany({
      data: inputs.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body,
        href: i.href ?? null,
      })),
    });
  },
};

export function getNotificationService(): NotificationService {
  return dbNotifications;
}

export const notify = getNotificationService();
