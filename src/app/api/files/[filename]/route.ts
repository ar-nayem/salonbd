import { NextResponse } from "next/server";
import { readUpload } from "@/lib/uploads";

/** Reads from disk per request, so a file uploaded a second ago is served. */
export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const file = await readUpload(filename);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
