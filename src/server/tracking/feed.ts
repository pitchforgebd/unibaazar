import { prisma } from "@/lib/db";
import { siteOrigin } from "@/server/tracking/config";

type FeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
  availability: "in stock" | "out of stock";
  price: string;
  brand: string;
};

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function feedItems(): Promise<FeedItem[]> {
  const origin = siteOrigin();
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    include: {
      brand: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      variants: { where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  return products.flatMap((product) => {
    const variant = product.variants[0];
    if (!variant) {
      return [];
    }
    const amount = variant.salePrice ?? variant.price;
    const image = product.images[0]?.url || variant.imageUrl || "";
    const absoluteImage = image.startsWith("http")
      ? image
      : image
        ? `${origin}${image.startsWith("/") ? "" : "/"}${image}`
        : "";
    return [
      {
        id: variant.sku,
        title: product.name,
        description: product.shortDescription,
        link: `${origin}/product/${product.slug}`,
        image: absoluteImage,
        availability: variant.stock > 0 ? "in stock" : "out of stock",
        price: `${amount.toNumber()} BDT`,
        brand: product.brand.name,
      },
    ];
  });
}

export async function facebookFeedXml(): Promise<string> {
  const items = await feedItems();
  const body = items
    .map(
      (item) => `    <item>
      <g:id>${xml(item.id)}</g:id>
      <g:title>${xml(item.title)}</g:title>
      <g:description>${xml(item.description)}</g:description>
      <g:link>${xml(item.link)}</g:link>
      <g:image_link>${xml(item.image)}</g:image_link>
      <g:availability>${item.availability}</g:availability>
      <g:price>${xml(item.price)}</g:price>
      <g:brand>${xml(item.brand)}</g:brand>
      <g:condition>new</g:condition>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>UniBaazar</title>
    <link>${xml(siteOrigin())}</link>
${body}
  </channel>
</rss>`;
}

export async function googleFeedCsv(): Promise<string> {
  const items = await feedItems();
  const header = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "availability",
    "price",
    "brand",
    "condition",
  ];
  const lines = items.map((item) =>
    [
      item.id,
      item.title,
      item.description,
      item.link,
      item.image,
      item.availability,
      item.price,
      item.brand,
      "new",
    ]
      .map(csv)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
