import { ApiError } from "@/server/http";

export async function assertCaptcha(token: string | undefined): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(500, "CAPTCHA is not configured");
    }
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
