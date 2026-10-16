import { renderInvoicePdf } from "@/lib/pdf/invoice";
import { ordersAccess } from "@/server/admin/access";
import { loadPrintDocuments } from "@/server/admin/orders-admin";
import { loadGeneral, loadInvoice } from "@/server/settings/store";

export async function GET(request: Request) {
  const session = await ordersAccess();
  if (!session) {
    return new Response("Orders access required", { status: 403 });
  }
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return new Response("No orders selected", { status: 400 });
  }
  const [documents, business, invoice] = await Promise.all([
    loadPrintDocuments(ids, "invoice"),
    loadGeneral(),
    loadInvoice(),
  ]);
  if (documents.length === 0) {
    return new Response("No matching orders", { status: 404 });
  }
  const pdf = await renderInvoicePdf(documents, business, invoice);
  const filename = documents.length === 1 ? documents[0].invoiceNumber : "invoices";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
