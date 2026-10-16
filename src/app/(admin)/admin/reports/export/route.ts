import { reportsAccess } from "@/server/admin/access";
import {
  loadReport,
  parseReportQuery,
  reportToCsv,
  reportToExcel,
} from "@/server/admin/reports";
import { renderReportPdf } from "@/lib/pdf/report";
import { loadGeneral } from "@/server/settings/store";

export async function GET(request: Request) {
  const session = await reportsAccess();
  if (!session) {
    return new Response("Reports access required", { status: 403 });
  }
  const url = new URL(request.url);
  const query = parseReportQuery({
    report: url.searchParams.get("report") ?? undefined,
    preset: url.searchParams.get("preset") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const table = await loadReport(query);
  const format = url.searchParams.get("format");
  if (format === "pdf") {
    const general = await loadGeneral();
    const pdf = await renderReportPdf(table, general.name);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${table.id}.pdf"`,
      },
    });
  }
  if (format === "xls") {
    return new Response(reportToExcel(table), {
      headers: {
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "content-disposition": `attachment; filename="${table.id}.xls"`,
      },
    });
  }
  return new Response(`\uFEFF${reportToCsv(table)}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${table.id}.csv"`,
    },
  });
}
