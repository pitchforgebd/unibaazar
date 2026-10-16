import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CartView } from "@/components/store/cart/CartView";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <>
      <PageTitle
        title="Cart"
        crumbs={[{ href: "/", label: "Home" }, { label: "Cart" }]}
      />
      <Container className="py-6">
        <CartView />
      </Container>
    </>
  );
}
