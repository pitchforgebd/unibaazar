import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MissBeacon } from "@/components/store/seo/MissBeacon";
import { Container } from "@/components/ui/Container";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { PageTitle } from "@/components/store/common/PageTitle";

export default async function StoreNotFound() {
  const t = await getTranslations("error");
  return (
    <>
      <MissBeacon />
      <PageTitle title={t("notFound.title")} />
      <Container className="py-10">
        <p className="text-sm text-muted">{t("notFound.body")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className={buttonStyles({ variant: "primary" })}>
            {t("notFound.homeButton")}
          </Link>
          <Link href="/shop" className={buttonStyles({ variant: "outline" })}>
            {t("notFound.shopButton")}
          </Link>
        </div>
      </Container>
    </>
  );
}
