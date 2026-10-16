import type { Metadata } from "next";
import { PasswordForm } from "@/components/store/account/AccountForms";

export const metadata: Metadata = { title: "Password" };

export default function PasswordPage() {
  return <PasswordForm />;
}
