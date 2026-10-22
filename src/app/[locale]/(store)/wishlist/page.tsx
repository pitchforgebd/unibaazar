import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { WishlistView } from "@/components/store/lists/WishlistView";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <>
      <PageTitle
        title="Wishlist"
        crumbs={[{ href: "/", label: "Home" }, { label: "Wishlist" }]}
      />
      <Container className="py-6">
        <WishlistView />
      </Container>
    </>
  );
}
