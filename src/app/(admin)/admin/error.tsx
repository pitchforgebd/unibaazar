"use client";

import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { reportError } from "@/lib/logger";

// Admin has no next-intl provider anywhere in its tree (it's outside the
// [locale] route group — see src/app/(admin)/layout.tsx's hardcoded
// lang="en"), so this uses plain English strings directly, like every
// other admin component, instead of useTranslations() — which would
// throw here with no provider to read from, breaking the one component
// whose entire job is to stay up when something else has already broken.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { scope: "errorBoundary.admin", digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-ink">This panel hit an error</h1>
      <p className="mt-2 text-sm text-muted">
        Something broke while rendering this admin screen. You can try again, or come back
        later.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted">Reference {error.digest}</p>
      ) : null}
      <button
        type="button"
        className={`${buttonStyles({ variant: "primary" })} mt-4`}
        onClick={reset}
      >
        Try again
      </button>
    </div>
  );
}
