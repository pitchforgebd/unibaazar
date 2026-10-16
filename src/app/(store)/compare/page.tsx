import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CompareView } from "@/components/store/lists/CompareView";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <>
      <PageTitle
        title="Compare"
        crumbs={[{ href: "/", label: "Home" }, { label: "Compare" }]}
      />
      <Container className="py-6">
        <CompareView />
      </Container>
    </>
  );
}
