import { cookies } from "next/headers";
import { assertCaptcha } from "@/server/security/captcha";
import { secureCookies } from "@/server/security/cookies";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimitPersistent } from "@/server/security/rate-limit-db";

const windows = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  otp: { limit: 5, windowMs: 15 * 60 * 1000 },
  checkout: { limit: 10, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export type WriteBucket = keyof typeof windows;

export type RequestContext = {
  ip: string;
  device: string;
};

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return (forwarded || real || "unknown").slice(0, 64);
}

function deviceFromCookie(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = header.match(/(?:^|;\s*)ub_device=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]).slice(0, 64) : null;
}

export async function guardWrite(
  request: Request,
  bucket: WriteBucket,
  captchaToken?: string,
): Promise<RequestContext> {
  assertSameOrigin(request);
  const ip = clientIp(request);
  const rule = windows[bucket];
  // DB-backed so the limit survives a restart (§5.6) — the in-memory
  // limiter this used to call resets on every deploy/crash, handing an
  // attacker a fresh budget each time.
  await rateLimitPersistent(`${bucket}:${ip}`, rule.limit, rule.windowMs);
  await assertCaptcha(captchaToken);
  const existing = deviceFromCookie(request.headers.get("cookie"));
  const device = existing ?? crypto.randomUUID();
  if (!existing) {
    const jar = await cookies();
    jar.set("ub_device", device, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return { ip, device };
}
