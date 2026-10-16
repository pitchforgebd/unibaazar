import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { FlashCountdown } from "@/components/store/home/FlashCountdown";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { prisma } from "@/lib/db";
import { listStoreProducts } from "@/server/catalog/products";

export const metadata: Metadata = { title: "Flash deals" };

export default async function FlashDealsPage() {
  const [products, nextFlashSale] = await Promise.all([
    listStoreProducts(),
    prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
      orderBy: { endsAt: "asc" },
      select: { endsAt: true },
    }),
  ]);
  const deals = products.filter((product) => product.flashSale);
  return (
    <>
      <PageTitle
        title="Flash deals"
        subtitle="Prices and stock on these deals can change when the countdown ends."
        crumbs={[{ href: "/", label: "Home" }, { label: "Flash deals" }]}
      />
      <Container className="py-6">
        {nextFlashSale ? (
          <div className="mb-6">
            <FlashCountdown endsAt={nextFlashSale.endsAt.toISOString()} />
          </div>
        ) : null}
        {deals.length > 0 ? (
          <ProductGrid products={deals} />
        ) : (
          <p className="rounded-lg bg-card p-6 text-sm shadow-soft">
            No flash deals are running right now.
          </p>
        )}
      </Container>
    </>
  );
}
