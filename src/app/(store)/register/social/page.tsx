import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { SocialCompleteForm } from "@/components/store/auth/SocialCompleteForm";
import { oauthPendingCookie, readPendingOAuth } from "@/server/auth/oauth";

export const metadata: Metadata = { title: "Finish social sign-in" };

export default async function SocialRegisterPage() {
  const jar = await cookies();
  const token = jar.get(oauthPendingCookie.name)?.value;
  const pending = token ? await readPendingOAuth(token) : null;
  if (!pending) {
    redirect("/login");
  }
  return (
    <>
      <PageTitle
        title="Finish your account"
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/register", label: "Register" },
          { label: "Social" },
        ]}
      />
      <Container className="py-8">
        <SocialCompleteForm name={pending.name} email={pending.email} />
      </Container>
    </>
  );
}
