import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSlots } from "@/lib/availability";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const serviceIds = (url.searchParams.get("services") || "").split(",").filter(Boolean);
  const staffId = url.searchParams.get("staff") || null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "BAD_DATE" }, { status: 400 });
  }
  if (serviceIds.length === 0) return NextResponse.json({ slots: [], durationMin: 0 });

  const services = await db.service.findMany({
    where: { id: { in: serviceIds }, shopId: id, isActive: true },
    select: { durationMin: true },
  });
  const durationMin = services.reduce((sum, s) => sum + s.durationMin, 0);

  const slots = await getSlots({ shopId: id, date, serviceIds, durationMin, staffId });

  return NextResponse.json({
    durationMin,
    slots: slots.map((s) => ({ startMin: s.startMin, staffIds: s.staffIds })),
  });
}
