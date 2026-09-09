import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const ERRORS: Record<string, number> = {
  NO_FILE: 400,
  BAD_TYPE: 415,
  TOO_LARGE: 413,
  WRITE_FAILED: 500,
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const limit = rateLimit(`upload:${user.id}:${clientIp(req)}`, 40, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });

  const form = await req.formData();
  const file = form.get("file");
  const allowVideo = form.get("allowVideo") === "true";

  const result = await saveUpload(file instanceof File ? file : null, {
    uploaderId: user.id,
    allowVideo,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: ERRORS[result.error] });

  return NextResponse.json({ url: result.url, id: result.id });
}
