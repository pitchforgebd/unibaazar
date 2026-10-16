import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CheckoutForm } from "@/components/store/checkout/CheckoutForm";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { loadCheckout } from "@/server/settings/store";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const checkout = await loadCheckout();
  return (
    <>
      <PageTitle
        title="Checkout"
        subtitle={
          checkout.guest
            ? "Guest checkout. Phone number is required."
            : "Sign in to place an order. Phone number is required."
        }
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/cart", label: "Cart" },
          { label: "Checkout" },
        ]}
      />
      <Container className="py-6">
        <TrackOnce name="InitiateCheckout" />
        <CheckoutForm codEnabled={checkout.cod} />
      </Container>
    </>
  );
}
