import type { Metadata } from "next";
import { AnalyticsPanel } from "@/components/admin/analytics/AnalyticsPanel";
import { ReportsDenied } from "@/components/admin/reports/ReportsDenied";
import { reportsAccess } from "@/server/admin/access";
import { countActiveVisitors, loadAnalytics } from "@/server/admin/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const session = await reportsAccess();
  if (!session) {
    return <ReportsDenied />;
  }
  const [data, liveCount] = await Promise.all([loadAnalytics(), countActiveVisitors()]);
  return <AnalyticsPanel data={data} liveCount={liveCount} />;
}
