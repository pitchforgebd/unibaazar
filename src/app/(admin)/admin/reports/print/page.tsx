import type { Metadata } from "next";
import { PrintReport } from "@/components/admin/reports/PrintReport";
import { ReportView } from "@/components/admin/reports/ReportView";
import { ReportsDenied } from "@/components/admin/reports/ReportsDenied";
import { reportsAccess } from "@/server/admin/access";
import { loadReport, parseReportQuery } from "@/server/admin/reports";

export const metadata: Metadata = { title: "Print report" };

type PrintPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportPrintPage({ searchParams }: PrintPageProps) {
  const session = await reportsAccess();
  if (!session) {
    return <ReportsDenied />;
  }
  const query = parseReportQuery(await searchParams);
  const table = await loadReport(query);
  return (
    <div className="space-y-4">
      <PrintReport />
      <ReportView query={query} table={table} print />
    </div>
  );
}
