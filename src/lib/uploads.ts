import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, stat } from "fs/promises";
import path from "path";
import { db } from "./db";
import { ALLOWED_IMAGE_MIME, ALLOWED_VIDEO_MIME, MAX_UPLOAD_BYTES } from "./constants";

/**
 * Uploads live outside the framework's static directory and are served by a
 * route that reads from disk per request. A static directory is indexed at
 * boot, so a file written after start would 404 until the server restarts.
 */
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export type SaveResult =
  | { ok: true; url: string; filename: string; id: string }
  | { ok: false; error: "NO_FILE" | "BAD_TYPE" | "TOO_LARGE" | "WRITE_FAILED" };

export async function saveUpload(
  file: File | null,
  opts: { uploaderId?: string | null; allowVideo?: boolean } = {},
): Promise<SaveResult> {
  if (!file || typeof file === "string" || file.size === 0) return { ok: false, error: "NO_FILE" };

  const allowed: string[] = [
    ...ALLOWED_IMAGE_MIME,
    ...(opts.allowVideo ? ALLOWED_VIDEO_MIME : []),
  ];
  // The browser's Content-Type is a hint, so the extension comes from our own
  // allow-list rather than from the uploaded filename.
  if (!allowed.includes(file.type)) return { ok: false, error: "BAD_TYPE" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "TOO_LARGE" };

  const filename = `${randomUUID()}.${EXTENSIONS[file.type] ?? "bin"}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
    const record = await db.uploadedFile.create({
      data: {
        filename,
        mime: file.type,
        size: file.size,
        kind: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        uploaderId: opts.uploaderId ?? null,
      },
    });
    return { ok: true, url: fileUrl(filename), filename, id: record.id };
  } catch (err) {
    console.error("[uploads] write failed", err);
    return { ok: false, error: "WRITE_FAILED" };
  }
}

export function fileUrl(filename: string) {
  return `/api/files/${filename}`;
}

export async function readUpload(filename: string) {
  // Reject anything that could escape the upload directory.
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,4}$/i.test(filename)) return null;
  const full = path.join(UPLOAD_DIR, filename);
  try {
    const info = await stat(full);
    if (!info.isFile()) return null;
    const record = await db.uploadedFile.findUnique({ where: { filename } });
    const body = await readFile(full);
    return { body, mime: record?.mime ?? "application/octet-stream", size: info.size };
  } catch {
    return null;
  }
}

/**
 * Accepts our own relative upload paths as well as absolute URLs — a strict
 * URL check would reject "/api/files/..." and break our own uploader.
 */
export function isUsableImageRef(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  return /^https?:\/\/\S+$/i.test(v);
}
