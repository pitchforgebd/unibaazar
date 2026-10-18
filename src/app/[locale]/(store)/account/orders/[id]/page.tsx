import type { Metadata } from "next";
import { OrderDetail } from "@/components/store/account/OrderDetail";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: OrderPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}` };
}

export default async function AccountOrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
