import { prisma } from "@/lib/db";
import { alertLowStock } from "@/server/admin/alerts";
import { assertCronSecret } from "@/server/cron/auth";
import { handle } from "@/server/http";

export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const variants = await prisma.productVariant.findMany({
      where: {
        status: "ACTIVE",
        product: { status: "PUBLISHED" },
      },
      include: { product: { select: { id: true, name: true, lowStockThreshold: true } } },
    });
    let alerted = 0;
    for (const variant of variants) {
      if (variant.stock > variant.product.lowStockThreshold) {
        continue;
      }
      await alertLowStock({
        sku: variant.sku,
        name: variant.product.name,
        stock: variant.stock,
        threshold: variant.product.lowStockThreshold,
        productId: variant.product.id,
      });
      alerted += 1;
    }
    return { checked: variants.length, alerted };
  });
}
