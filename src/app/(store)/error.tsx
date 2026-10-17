"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");
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
      </div>
    </Container>
  );
}
