import type { Metadata } from "next";
import { OrderSuccessView } from "@/components/store/order/OrderSuccessView";

type OrderSuccessPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OrderSuccessPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

export default async function OrderSuccessPage({ params }: OrderSuccessPageProps) {
  const { id } = await params;
  return <OrderSuccessView id={id} />;
}
