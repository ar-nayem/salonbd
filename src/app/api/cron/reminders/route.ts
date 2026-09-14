import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReminders } from "@/lib/reminders";

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const run = await runReminders();
  if (run.sent.length > 0) console.log("[reminders]", JSON.stringify(run.sent));
  return NextResponse.json(run);
}

export const GET = handle;
export const POST = handle;
