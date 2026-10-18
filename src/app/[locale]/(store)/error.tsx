"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { reportError } from "@/lib/logger";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    reportError(error, { scope: "errorBoundary.store", digest: error.digest });
  }, [error]);

  return (
    <Container className="py-16">
      <h1 className="text-2xl font-bold text-ink">{t("boundary.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("boundary.body")}</p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted">
          {t("boundary.referencePrefix")}
          {error.digest}
        </p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <button type="button" className={buttonClass("primary")} onClick={reset}>
          {t("boundary.retry")}
        </button>
        <Link href="/" className={buttonClass("outline")}>
          {t("boundary.homeButton")}
        </Link>
        <Link href="/shop" className={buttonClass("outline")}>
          {t("notFound.shopButton")}
        </Link>
      </div>
    </Container>
  );
}
