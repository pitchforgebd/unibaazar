import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/store/account/ProfileForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("profileMetaTitle") };
}

export default function ProfilePage() {
  return <ProfileForm />;
}
