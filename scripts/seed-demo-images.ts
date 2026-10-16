// One-off script: adds demo product photos (from picsum.photos, deterministic
// per product slug so reruns don't churn URLs) via the same storeCatalogImage
// pipeline the real admin upload form uses (magic-byte sniffing + re-encode).
// Skips any product that already has at least one ProductImage row.
import { prisma } from "../src/lib/db";
import { storeCatalogImage } from "../src/server/admin/uploads";

async function fetchDemoImage(seed: string): Promise<Uint8Array> {
  const response = await fetch(
    `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/900`,
  );
  if (!response.ok) {
    throw new Error(`picsum.photos responded ${response.status} for seed ${seed}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function main() {
  const products = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      name: true,
      images: { select: { id: true }, take: 1 },
    },
  });

  let added = 0;
  let skipped = 0;
  for (const product of products) {
    if (product.images.length > 0) {
      skipped += 1;
      continue;
    }
    for (let index = 0; index < 2; index += 1) {
      const bytes = await fetchDemoImage(`${product.slug}-${index}`);
      const url = await storeCatalogImage(bytes, "image/jpeg");
      await prisma.productImage.create({
        data: { productId: product.id, url, alt: product.name, sortOrder: index },
      });
    }
    added += 1;
    console.log(`added images for ${product.slug}`);
  }
  console.log(`done. products with new images: ${added}, already had images: ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
