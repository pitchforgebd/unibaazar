import pino from "pino";

/**
 * Structured logger for the whole app.
 *
 * This module is imported from both server-only code (e.g. `src/server/http.ts`)
 * and from client components (the route-group error boundaries), so it has to stay
 * safe to bundle for the browser too. Pino ships a browser-compatible build that
 * webpack picks up automatically via its `browser` package.json field, which is why
 * we don't branch on `typeof window` for the import itself — only for options that
 * only make sense (or only work) in a Node process.
 *
 * - Production: plain structured JSON on stdout, which is what cPanel/Passenger's
 *   log capture and any future log aggregation expect.
 * - Development, server-side only: pretty-printed via `pino-pretty` for readability.
 *   This is intentionally gated on `NODE_ENV !== "production"` *and* on running in
 *   Node, so it can never affect how production logs are shaped, and so the
 *   pino-pretty transport (which relies on worker threads) is never attempted in a
 *   browser bundle.
 */
const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: isServer ? undefined : null,
  ...(isServer && !isProduction
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
});

/**
 * The single funnel every caught-but-unexpected error should go through.
 *
 * Today this just logs structured JSON (server-side) or delegates to the console
 * (browser-side, via pino's browser build). This is deliberately the one seam where
 * a future error-tracking service (Sentry or similar) would be wired in — when that
 * happens, it should be added here only, not scattered across every call site that
 * currently calls `reportError`.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  logger.error(
    {
      ...context,
      err: {
        message: normalized.message,
        name: normalized.name,
        stack: normalized.stack,
      },
    },
    normalized.message,
  );
  // Future hook: forward `normalized` (and `context`) to an external error-tracking
  // service (e.g. Sentry.captureException) here, in addition to the log above.
}
