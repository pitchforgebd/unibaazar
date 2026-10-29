import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { assertCaptcha } from "@/server/security/captcha";
import { secureCookies } from "@/server/security/cookies";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimitPersistent } from "@/server/security/rate-limit-db";

/**
 * Limits are two-tier, and the reason is specific to this market.
 *
 * Bangladesh's mobile networks (GP, Robi, Banglalink) put large numbers
 * of subscribers behind a single CGNAT IPv4. An IP-only limit therefore
 * doesn't measure "one person trying too often", it measures "how busy
 * this carrier's NAT pool is" — so the old flat `5 OTPs / 15 min / IP`
 * would start refusing real customers' logins at peak, and the refusal
 * looks like an attack in the logs rather than a capacity problem.
 *
 * So: the tight limit is keyed on the **identity** being acted on (the
 * phone number or email in the request), which is what actually needs
 * protecting — it stops someone hammering one account. The per-IP
 * limit stays, but as a loose backstop against a single host flooding
 * an endpoint, set high enough that a shared carrier IP won't trip it.
 */
const identityWindows = {
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  otp: { limit: 5, windowMs: 15 * 60 * 1000 },
  checkout: { limit: 6, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 3, windowMs: 60 * 60 * 1000 },
} as const;

const ipWindows = {
  login: { limit: 80, windowMs: 15 * 60 * 1000 },
  otp: { limit: 60, windowMs: 15 * 60 * 1000 },
  checkout: { limit: 100, windowMs: 60 * 60 * 1000 },
  contact: { limit: 40, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 40, windowMs: 60 * 60 * 1000 },
} as const;

export type WriteBucket = keyof typeof identityWindows;

export type RequestContext = {
  ip: string;
  device: string;
};

/**
 * `X-Forwarded-For` is "client, proxy1, proxy2…": the **leftmost** entry
 * is whatever the client claimed, so reading it (as this used to) lets
 * anyone set their own rate-limit key — either to evade a limit, or to
 * burn through someone else's bucket and lock them out. Only the
 * entries appended by our own proxies can be trusted.
 *
 * `TRUSTED_PROXY_HOPS` is how many proxies sit in front of the app (1
 * for this host's cPanel/Apache reverse proxy, which is the default).
 * We count that many from the right; anything further left is
 * client-controlled and ignored.
 */
export function clientIp(request: Request): string {
  const hops = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  const chain = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const trustedHops = Number.isFinite(hops) && hops > 0 ? Math.floor(hops) : 1;
  const fromChain =
    chain.length > 0 ? chain[Math.max(0, chain.length - trustedHops)] : "";
  const real = request.headers.get("x-real-ip")?.trim();
  return (fromChain || real || "unknown").slice(0, 64);
}

function deviceFromCookie(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = header.match(/(?:^|;\s*)ub_device=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]).slice(0, 64) : null;
}

/** Hashed so the limiter table never holds a raw phone number or email —
 * the bucket only needs a stable opaque key, not readable PII. */
function identityKey(identity: string): string {
  return createHash("sha256").update(identity.trim().toLowerCase()).digest("hex");
}

export async function guardWrite(
  request: Request,
  bucket: WriteBucket,
  captchaToken?: string,
  /** The phone/email this request acts on, where the route already knows
   * it. Passing it is what gives the tight limit something meaningful to
   * key on — see the comment on `identityWindows`. Omitting it leaves
   * only the loose per-IP backstop. */
  identity?: string,
): Promise<RequestContext> {
  assertSameOrigin(request);
  const ip = clientIp(request);
  // Both tiers are DB-backed so they survive a restart (§5.6) — the
  // in-memory limiter this used to call resets on every deploy/crash,
  // handing an attacker a fresh budget each time.
  const ipRule = ipWindows[bucket];
  await rateLimitPersistent(`${bucket}:ip:${ip}`, ipRule.limit, ipRule.windowMs);
  if (identity?.trim()) {
    const rule = identityWindows[bucket];
    await rateLimitPersistent(
      `${bucket}:id:${identityKey(identity)}`,
      rule.limit,
      rule.windowMs,
    );
  }
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
