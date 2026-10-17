import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MissBeacon } from "@/components/store/seo/MissBeacon";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { PageTitle } from "@/components/store/common/PageTitle";
import { StoreShell } from "@/components/store/layout/StoreShell";

export default async function NotFound() {
  const t = await getTranslations("error");
  return (
    <StoreShell>
      <MissBeacon />
      <PageTitle title={t("notFound.title")} />
      <Container className="py-10">
        <p className="text-sm text-muted">{t("notFound.body")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className={buttonClass("primary")}>
            {t("notFound.homeButton")}
          </Link>
          <Link href="/shop" className={buttonClass("outline")}>
            {t("notFound.shopButton")}
          </Link>
        </div>
      </Container>
    </StoreShell>
  );
}
