import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OrderSuccessView } from "@/components/store/order/OrderSuccessView";

type OrderSuccessPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OrderSuccessPageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("orders");
  return { title: t("metaTitle", { id }) };
}

export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const { id } = await params;
  return <OrderSuccessView id={id} />;
}
