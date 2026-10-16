import { ApiError } from "@/server/http";

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export function resetRateLimits(): void {
  buckets.clear();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): void {
  const bucket = buckets.get(key) ?? { hits: [] };
  const fresh = bucket.hits.filter((hit) => now - hit < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, { hits: fresh });
    throw new ApiError(429, "Too many attempts. Try again shortly.");
  }
  fresh.push(now);
  buckets.set(key, { hits: fresh });
}
