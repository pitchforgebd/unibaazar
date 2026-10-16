import type { Metadata } from "next";
import Link from "next/link";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { PrintButton } from "@/components/admin/orders/PrintButton";
import { PrintSheets } from "@/components/admin/orders/PrintSheets";
import { ordersAccess } from "@/server/admin/access";
import { loadPrintDocuments, parsePrintKind } from "@/server/admin/orders-admin";
import { loadGeneral, loadInvoice } from "@/server/settings/store";

export const metadata: Metadata = { title: "Print orders" };

type PrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function PrintOrdersPage({ searchParams }: PrintPageProps) {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const params = await searchParams;
  const ids = one(params.ids)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [documents, invoice, general] = await Promise.all([
    loadPrintDocuments(ids, parsePrintKind(one(params.kind))),
    loadInvoice(),
    loadGeneral(),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin/orders" className="text-sm font-semibold text-primary">
          Back to orders
        </Link>
        <PrintButton />
      </div>
      <PrintSheets
        documents={documents}
        footerNote={invoice.footer}
        vatPercent={invoice.vatPercent}
        signature={invoice.signature}
        storeName={general.name || "UniBaazar"}
        logoUrl={general.logo}
      />
    </div>
  );
}
