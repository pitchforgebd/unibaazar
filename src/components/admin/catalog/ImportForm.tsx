"use client";

import Link from "next/link";
import { useState } from "react";
import { importProductsAction } from "@/app/(admin)/admin/catalog-actions";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Spinner } from "@/components/ui/Spinner";
import { useToastStore } from "@/store/toast";

export function ImportForm() {
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Import products</h1>
        <Link href="/admin/products" className={buttonStyles({ variant: "outline" })}>
          All products
        </Link>
      </div>
      <section className="max-w-xl space-y-3 rounded-theme bg-card p-4 shadow-soft">
        <p className="text-sm text-muted">
          Use a CSV file. In Excel, choose Save As and pick CSV UTF-8. Columns: name,
          slug, sku, price, salePrice, stock, brand, category, status, shortDescription.
          Brand and category are slugs.
        </p>
        <label className={buttonStyles({ className: pending ? "cursor-wait" : "" })}>
          {pending ? <Spinner /> : null}
          {pending ? "Importing…" : "Choose CSV"}
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              setPending(true);
              void file
                .text()
                .then((csv) => importProductsAction(csv))
                .then((result) => {
                  push({
                    message: result.message,
                    type: result.ok ? "success" : "error",
                  });
                  setPending(false);
                });
            }}
          />
        </label>
      </section>
    </div>
  );
}
