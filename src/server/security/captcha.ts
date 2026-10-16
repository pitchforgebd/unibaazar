import { ApiError } from "@/server/http";

export async function assertCaptcha(token: string | undefined): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Turnstile is opt-in: until a site key + secret are saved, every
    // environment (including production) skips the check rather than
    // hard-locking login/checkout. Set TURNSTILE_SECRET_KEY and
    // NEXT_PUBLIC_TURNSTILE_SITE_KEY to turn it on.
    return;
  }
  if (!token) {
    throw new ApiError(400, "Complete the CAPTCHA");
  }
  const body = new URLSearchParams({ secret, response: token });
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  const success =
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    payload.success === true;
  if (!success) {
    throw new ApiError(400, "Complete the CAPTCHA");
  }
}
