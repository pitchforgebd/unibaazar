import type { Metadata } from "next";
import { ProfileForm } from "@/components/store/account/AccountForms";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return <ProfileForm />;
}
