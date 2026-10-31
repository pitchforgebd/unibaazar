import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
  "https://challenges.cloudflare.com",
  "https://www.instagram.com",
  "https://www.youtube.com",
]
  .filter(Boolean)
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.cdninstagram.com https://*.fbcdn.net https://i.ytimg.com",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc}`,
  "connect-src 'self' https://challenges.cloudflare.com https://accounts.google.com https://oauth2.googleapis.com https://graph.facebook.com https://www.googleapis.com",
  "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.facebook.com",
].join("; ");

const nextConfig: NextConfig = {
  // Deliberately not "standalone": this project runs via its own root
  // server.js against a full `npm install`, not the trimmed
  // .next/standalone bundle, so standalone mode only adds pure overhead
  // here — an extra file-tracing build step (collect-build-traces.js) that
  // was the thing actually failing to spawn its worker on this host.
  // Shared/constrained hosts (e.g. cPanel + CloudLinux) often report a CPU
  // count far above what the account is actually allowed to run as
  // processes, so Next's default "one build worker per core" trips the
  // host's process-limit guard with EAGAIN. One worker avoids that; it
  // only slows the build, it never affects the running app.
  experimental: {
    cpus: 1,
    // Next's default Server Action body limit is 1 MB, which silently
    // rejected most phone photos before reencodeImage's own size check
    // (MAX_UPLOAD_MB in src/lib/media/uploadLimits.ts) ever ran. Kept just
    // above that cap to leave room for multipart overhead. The admin UI
    // shrinks photos in the browser first (src/lib/media/prepareUpload.ts),
    // so in practice uploads are far smaller than this.
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  // The "Linting and checking validity of types" build step is the single
  // heaviest part of `next build` memory-wise, and this repo already runs
  // `tsc --noEmit` + `eslint .` as separate, required CI/pre-commit steps —
  // so it's pure redundant memory cost during the production build itself,
  // which is what was tipping a CPU/RAM-constrained host into an OOM crash.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Next's built-in image optimizer re-encodes images on demand, at request
  // time, in the server process — another multi-threaded workload the
  // production host's ~5-OS-thread ceiling can't survive (see
  // ARCHITECTURE.md §12). Variants are pre-generated at upload time instead
  // (src/server/media/variants.ts) and this custom loader just maps a
  // requested width onto the nearest pre-generated file; see
  // src/lib/media/imageLoader.ts for the AVIF/WebP tradeoff.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/media/imageLoader.ts",
  },
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=15552000; includeSubDomains",
      });
    }
    return [
      { source: "/:path*", headers },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: siteOrigin },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
