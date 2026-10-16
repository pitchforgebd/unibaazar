import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ForgotForm } from "@/components/store/auth/AuthForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <PageTitle
        title="Forgot password"
        crumbs={[{ href: "/", label: "Home" }, { label: "Forgot password" }]}
      />
      <Container className="py-8">
        <ForgotForm />
      </Container>
    </>
  );
}
