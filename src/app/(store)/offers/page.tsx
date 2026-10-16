import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { products } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Offers" };

export default function OffersPage() {
  const offers = products.filter((product) =>
    product.variants.some((variant) => variant.salePrice !== null),
  );
  return (
    <>
      <PageTitle
        title="Offers"
        crumbs={[{ href: "/", label: "Home" }, { label: "Offers" }]}
      />
      <Container className="py-6">
        <ProductGrid products={offers} />
      </Container>
    </>
  );
}
