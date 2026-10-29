import { formatTaka } from "@/lib/utils/currency";
import type { PrintDocument } from "@/server/admin/orders-admin";

export function PrintSheets({
  documents,
  footerNote,
  vatPercent,
  signature,
  storeName = "UniBaazar",
  logoUrl,
}: {
  documents: PrintDocument[];
  footerNote?: string;
  vatPercent?: number;
  signature?: string;
  storeName?: string;
  logoUrl?: string;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted">No orders were found for this print job.</p>;
  }
  return (
    <div className="space-y-8">
      {documents.map((doc, index) => (
        <article
          key={`${doc.id}-${doc.kind}`}
          className={`rounded-theme bg-card p-6 text-ink shadow-soft print:rounded-none print:shadow-none ${
            index < documents.length - 1 ? "print:break-after-page" : ""
          }`}
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-10 max-w-[180px] object-contain"
                />
              ) : (
                <p className="text-2xl font-bold text-primary">{storeName}</p>
              )}
              <h1 className="mt-1 text-lg font-semibold">
                {doc.kind === "packing"
                  ? "Packing slip"
                  : doc.kind === "label"
                    ? "Shipping label"
                    : "Invoice"}
              </h1>
              <p className="text-sm">{doc.invoiceNumber}</p>
              <p className="text-sm">Order {doc.number}</p>
            </div>
            <div className="text-right">
              <div dangerouslySetInnerHTML={{ __html: doc.qr }} />
            </div>
          </header>

          {doc.kind === "label" ? (
            <div className="mt-6 space-y-1 text-sm">
              <p className="text-lg font-semibold">{doc.name}</p>
              <p>{doc.phone}</p>
              <p>{doc.address}</p>
              <p>{doc.area}</p>
              <p>COD {formatTaka(doc.codAmount)}</p>
              <p>Tracking {doc.trackingId || "—"}</p>
              {doc.consignmentId ? <p>Consignment {doc.consignmentId}</p> : null}
            </div>
          ) : (
            <>
              <div className="mt-4 text-sm">
                <p className="font-semibold">{doc.name}</p>
                <p>{doc.phone}</p>
                {doc.email ? <p>{doc.email}</p> : null}
                <p>{doc.address}</p>
                <p>
                  {doc.area} · {doc.paymentMethod}
                </p>
              </div>
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="py-2">Item</th>
                    <th className="py-2">Qty</th>
                    {doc.kind === "invoice" ? <th className="py-2">Price</th> : null}
                    {doc.kind === "invoice" ? <th className="py-2">Total</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {doc.items.map((item) => (
                    <tr
                      key={`${item.sku}-${item.name}`}
                      className="border-b border-black/5"
                    >
                      <td className="py-2">
                        {item.name}
                        <span className="block text-xs text-muted">{item.sku}</span>
                      </td>
                      <td className="py-2">{item.qty}</td>
                      {doc.kind === "invoice" ? (
                        <td className="py-2">{formatTaka(item.unitPrice)}</td>
                      ) : null}
                      {doc.kind === "invoice" ? (
                        <td className="py-2">{formatTaka(item.lineTotal)}</td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {doc.kind === "invoice" ? (
                <div className="mt-4 space-y-1 text-sm">
                  <p>Subtotal {formatTaka(doc.subtotal)}</p>
                  <p>Discount {formatTaka(doc.discount)}</p>
                  <p>Delivery {formatTaka(doc.deliveryCharge)}</p>
                  <p className="font-semibold">Total {formatTaka(doc.total)}</p>
                  {vatPercent && vatPercent > 0 ? <p>VAT rate {vatPercent}%</p> : null}
                  {footerNote ? <p className="pt-2">{footerNote}</p> : null}
                  {signature ? <p className="pt-4">{signature}</p> : null}
                </div>
              ) : null}
            </>
          )}
          <div className="mt-6" dangerouslySetInnerHTML={{ __html: doc.barcode }} />
        </article>
      ))}
    </div>
  );
}
