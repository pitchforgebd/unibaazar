"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="py-16">
      <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">Please try the page again.</p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted">Reference {error.digest}</p>
      ) : null}
      <div className="mt-4 flex gap-3">
        <button type="button" className={buttonClass("primary")} onClick={reset}>
          Try again
        </button>
        <Link href="/" className={buttonClass("outline")}>
          Home
        </Link>
      </div>
    </Container>
  );
}
