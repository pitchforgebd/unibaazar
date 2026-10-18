"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/controls";
import { reportError } from "@/lib/logger";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    reportError(error, { scope: "errorBoundary.admin", digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-ink">{t("boundaryAdmin.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("boundaryAdmin.body")}</p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted">
          {t("boundaryAdmin.referencePrefix")}
          {error.digest}
        </p>
      ) : null}
      <button type="button" className={`${buttonClass("primary")} mt-4`} onClick={reset}>
        {t("boundaryAdmin.retry")}
      </button>
    </div>
  );
}
