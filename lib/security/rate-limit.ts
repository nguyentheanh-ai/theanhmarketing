import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();
let lastPrunedAt = 0;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
}

export function rateLimitKey(request: Request, scope: string) {
  return `${scope}:${getClientIp(request)}`;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now();

  if (now - lastPrunedAt > 60_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }

    lastPrunedAt = now;
  }

  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return { ok: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    { ok: false, message: "Qua nhieu yeu cau. Vui long thu lai sau it phut." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    },
  );
}
