import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qrPngBuffer } from "@/lib/qr";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const size = Number(new URL(req.url).searchParams.get("size") ?? 512);

  const code = await db.qrCode.findUnique({ where: { token }, select: { id: true } });
  if (!code) return new NextResponse("Not found", { status: 404 });

  const png = await qrPngBuffer(token, Number.isFinite(size) ? Math.min(Math.max(size, 128), 1024) : 512);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="salonbd-${token}.png"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
