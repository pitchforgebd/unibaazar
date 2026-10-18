import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { FlashCountdown } from "@/components/store/home/FlashCountdown";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { prisma } from "@/lib/db";
import { listStoreProducts } from "@/server/catalog/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("flashDealsTitle") };
}

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
  const t = await getTranslations("shop");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("flashDealsTitle")}
        subtitle={t("flashDealsSubtitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("flashDealsTitle") }]}
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
            {t("noFlashDeals")}
          </p>
        )}
      </Container>
    </>
  );
}
