import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AddressBook } from "@/components/store/account/AddressBook";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("addressesMetaTitle") };
}

export default function AddressesPage() {
  return <AddressBook />;
}
