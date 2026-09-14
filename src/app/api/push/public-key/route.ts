import { NextResponse } from "next/server";
import { pushConfigured } from "@/lib/push";

/** Served at runtime rather than inlined at build, so rotating keys needs no rebuild. */
export async function GET() {
  if (!pushConfigured()) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, publicKey: process.env.VAPID_PUBLIC_KEY });
}
