import { PrintButton } from "@/components/admin/orders/PrintButton";
import type { LabelSheet } from "@/server/admin/inventory";

export function LabelSheets({ labels }: { labels: LabelSheet[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold text-ink">Labels</h1>
        <PrintButton />
      </div>
      {labels.length === 0 ? (
        <p className="text-sm text-muted">
          Select variants on the stock page, then print labels.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {labels.map((label) => (
            <article
              key={label.sku}
              className="rounded-lg border border-black/10 bg-card p-4"
            >
              <p className="font-semibold text-ink">{label.name}</p>
              <p className="text-sm text-muted">{label.sku}</p>
              <div className="mt-3" dangerouslySetInnerHTML={{ __html: label.svg }} />
              <p className="mt-2 text-sm font-semibold text-ink">৳{label.price}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
