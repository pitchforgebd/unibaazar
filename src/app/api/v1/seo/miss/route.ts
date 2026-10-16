import { z } from "zod";
import { ApiError, handle, readJson } from "@/server/http";
import { clientIp } from "@/server/security/guard";
import { assertSameOrigin } from "@/server/security/origin";
import { rateLimit } from "@/server/security/rate-limit";
import { noteNotFound } from "@/server/seo/public";

const missSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (value) => value.startsWith("/") && !value.startsWith("//") && !value.includes("?"),
    ),
});

export async function POST(request: Request) {
  return handle(async () => {
    assertSameOrigin(request);
    rateLimit(`miss:${clientIp(request)}`, 30, 60 * 1000);
    const parsed = missSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      throw new ApiError(400, "Check the path");
    }
    const path = parsed.data.path;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/api") ||
      path.startsWith("/_next") ||
      path.includes(".")
    ) {
      return { ok: true };
    }
    await noteNotFound(path);
    return { ok: true };
  });
}
