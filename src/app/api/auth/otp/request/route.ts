import { NextResponse } from "next/server";
import { z } from "zod";
import { requestCode } from "@/lib/otp";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({ destination: z.string().trim().min(3).max(120) });

/**
 * Answers the same way whether or not an account exists, so this endpoint
 * cannot be used to discover who is registered. The code is never returned.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const raw = parsed.data.destination;
  const isEmail = raw.includes("@");
  const destination = isEmail ? raw.toLowerCase() : normalizePhone(raw);
  if (!destination) return NextResponse.json({ error: "INVALID_DESTINATION" }, { status: 400 });

  const result = await requestCode(destination, isEmail ? "EMAIL" : "SMS");

  if (!result.ok && result.error === "RATE_LIMITED") {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }
  if (!result.ok) {
    // Telling someone to check an inbox nothing will arrive in is worse than
    // saying the channel is not wired up.
    return NextResponse.json({ error: "NOT_DELIVERED", detail: result.detail }, { status: 503 });
  }
  return NextResponse.json({ ok: true, destination });
}
