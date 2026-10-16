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
  output: "standalone",
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
