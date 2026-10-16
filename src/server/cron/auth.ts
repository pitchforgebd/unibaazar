import { signaturesMatch } from "@/server/security/signature";
import { ApiError } from "@/server/http";

export function assertCronSecret(request: Request): void {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    throw new ApiError(401, "Cron endpoints are not configured");
  }
  const url = new URL(request.url);
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret");
  if (!signaturesMatch(provided, configured)) {
    throw new ApiError(401, "Invalid cron secret");
  }
}
