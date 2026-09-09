type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Small in-process limiter. Good enough for a single-node deployment. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, remaining: 0, retryInMs: bucket.resetAt - now };
  return { ok: true, remaining: limit - bucket.count };
}

export function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local"
  );
}
