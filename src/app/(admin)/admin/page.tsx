import type { Metadata } from "next";
import { DashboardHome } from "@/components/admin/DashboardHome";
import { loadDashboard } from "@/server/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminHomePage() {
  const data = await loadDashboard();
  return <DashboardHome data={data} />;
}
