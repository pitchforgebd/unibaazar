import type { Metadata } from "next";
import { AccountDashboard } from "@/components/store/account/AccountDashboard";

export const metadata: Metadata = { title: "My account" };

export default function AccountPage() {
  return <AccountDashboard />;
}
