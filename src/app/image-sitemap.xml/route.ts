import { prisma } from "@/lib/db";
import { siteOrigin } from "@/server/tracking/config";

export const dynamic = "force-dynamic";

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const origin = siteOrigin();
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      slug: true,
      name: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true } },
    },
    orderBy: { name: "asc" },
  });
  const urls = products
    .filter((product) => product.images.length > 0)
    .map((product) => {
      const images = product.images
        .map((image) => {
          const loc = image.url.startsWith("http")
            ? image.url
            : `${origin}${image.url.startsWith("/") ? "" : "/"}${image.url}`;
          return `      <image:image>\n        <image:loc>${xml(loc)}</image:loc>\n        <image:title>${xml(image.alt || product.name)}</image:title>\n      </image:image>`;
        })
        .join("\n");
      return `  <url>\n    <loc>${xml(`${origin}/product/${product.slug}`)}</loc>\n${images}\n  </url>`;
    })
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
