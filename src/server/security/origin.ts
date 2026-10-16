import { ApiError } from "@/server/http";

export function allowedOrigins(request: Request): Set<string> {
  const allowed = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      allowed.add(new URL(site).origin);
    } catch {
      // Ignore a malformed site URL and fall through to the request host.
    }
  }
  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    allowed.add(`${proto}://${host}`);
  }
  return allowed;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }
  if (!allowedOrigins(request).has(origin)) {
    throw new ApiError(403, "Cross-site request blocked");
  }
}
