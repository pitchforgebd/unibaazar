"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { buttonStyles } from "@/components/ui/buttonStyles";
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
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonStyles({ variant: "primary" })}
          onClick={reset}
        >
          {t("boundary.retry")}
        </button>
        <Link href="/" className={buttonStyles({ variant: "outline" })}>
          {t("boundary.homeButton")}
        </Link>
        <Link href="/shop" className={buttonStyles({ variant: "outline" })}>
          {t("notFound.shopButton")}
        </Link>
      </div>
    </Container>
  );
}
