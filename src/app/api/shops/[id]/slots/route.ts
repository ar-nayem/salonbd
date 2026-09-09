import { NextResponse } from "next/server";
import { getSlots } from "@/lib/availability";
import { cartDuration, type LineInput } from "@/lib/pricing";

/**
 * `lines` carries the whole cart as base64url JSON so each service keeps its
 * own options and add-ons. Duration is computed server-side from those ids, so
 * a client cannot shrink a booking to squeeze into a slot it should not get.
 */
function parseLines(url: URL): LineInput[] {
  const encoded = url.searchParams.get("lines");
  if (encoded) {
    try {
      const json = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      if (Array.isArray(json)) {
        return json
          .filter((l) => l && typeof l.serviceId === "string")
          .slice(0, 8)
          .map((l) => ({
            serviceId: l.serviceId as string,
            optionIds: Array.isArray(l.optionIds) ? (l.optionIds as string[]).slice(0, 10) : [],
            addonIds: Array.isArray(l.addonIds) ? (l.addonIds as string[]).slice(0, 10) : [],
          }));
      }
    } catch {
      return [];
    }
  }
  return (url.searchParams.get("services") || "")
    .split(",")
    .filter(Boolean)
    .map((serviceId) => ({ serviceId }));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const staffId = url.searchParams.get("staff") || null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "BAD_DATE" }, { status: 400 });
  }

  const lines = parseLines(url);
  if (lines.length === 0) return NextResponse.json({ slots: [], durationMin: 0 });

  const durationMin = await cartDuration(id, lines);
  if (durationMin === 0) return NextResponse.json({ slots: [], durationMin: 0 });

  const slots = await getSlots({
    shopId: id,
    date,
    serviceIds: [...new Set(lines.map((l) => l.serviceId))],
    durationMin,
    staffId,
  });

  return NextResponse.json({
    durationMin,
    slots: slots.map((s) => ({ startMin: s.startMin, staffIds: s.staffIds })),
  });
}
