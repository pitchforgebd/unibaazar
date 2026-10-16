import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { RegisterForm } from "@/components/store/auth/AuthForms";
import { SocialLoginButtons } from "@/components/store/auth/SocialLoginButtons";
import { oauthConfigured } from "@/server/auth/oauth";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  const [google, facebook] = await Promise.all([
    oauthConfigured("google"),
    oauthConfigured("facebook"),
  ]);
  return (
    <>
      <PageTitle
        title="Register"
        crumbs={[{ href: "/", label: "Home" }, { label: "Register" }]}
      />
      <Container className="py-8">
        <RegisterForm />
        <div className="mx-auto max-w-md">
          <SocialLoginButtons google={google} facebook={facebook} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm">
          <Link href="/login" className="font-semibold text-primary">
            Already have an account? Login
          </Link>
        </p>
      </Container>
    </>
  );
}
