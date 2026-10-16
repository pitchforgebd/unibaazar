import type { Metadata } from "next";
import { ReportView } from "@/components/admin/reports/ReportView";
import { ReportsDenied } from "@/components/admin/reports/ReportsDenied";
import { reportsAccess } from "@/server/admin/access";
import { loadReport, parseReportQuery } from "@/server/admin/reports";

export const metadata: Metadata = { title: "Reports" };

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await reportsAccess();
  if (!session) {
    return <ReportsDenied />;
  }
  const query = parseReportQuery(await searchParams);
  const table = await loadReport(query);
  return <ReportView query={query} table={table} />;
}
