import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountDashboard } from "@/components/store/account/AccountDashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("metaTitle") };
}

export default function AccountPage() {
  return <AccountDashboard />;
}
