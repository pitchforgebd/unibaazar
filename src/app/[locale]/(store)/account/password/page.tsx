import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PasswordForm } from "@/components/store/account/PasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("passwordMetaTitle") };
}

export default function PasswordPage() {
  return <PasswordForm />;
}
