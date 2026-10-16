import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { TrackOrderForm } from "@/components/store/order/TrackOrderForm";

export const metadata: Metadata = { title: "Track order" };

type TrackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrackOrderPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const order = typeof params.order === "string" ? params.order : "";
  const phone = typeof params.phone === "string" ? params.phone : "";

  return (
    <>
      <PageTitle
        title="Track order"
        crumbs={[{ href: "/", label: "Home" }, { label: "Track order" }]}
      />
      <Container className="py-6">
        <TrackOrderForm initialOrder={order} initialPhone={phone} />
      </Container>
    </>
  );
}
