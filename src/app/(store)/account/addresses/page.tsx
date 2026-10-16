import type { Metadata } from "next";
import { AddressBook } from "@/components/store/account/AccountForms";

export const metadata: Metadata = { title: "Addresses" };

export default function AddressesPage() {
  return <AddressBook />;
}
