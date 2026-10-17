import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CheckoutForm } from "@/components/store/checkout/CheckoutForm";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { loadCheckout } from "@/server/settings/store";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("metaTitle") };
}

export default async function CheckoutPage() {
  const checkout = await loadCheckout();
  const t = await getTranslations("checkout");
  const common = await getTranslations("common");
  const cart = await getTranslations("cart");
  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        subtitle={checkout.guest ? t("subtitleGuest") : t("subtitleSignIn")}
        crumbs={[
          { href: "/", label: common("home") },
          { href: "/cart", label: cart("crumb") },
          { label: t("crumb") },
        ]}
      />
      <Container className="py-6">
        <TrackOnce name="InitiateCheckout" />
        <CheckoutForm codEnabled={checkout.cod} />
      </Container>
    </>
  );
}
