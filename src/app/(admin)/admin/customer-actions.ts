"use server";

import { revalidatePath } from "next/cache";
import { requireCustomers } from "@/server/admin/access";
import {
  addCustomerAddress,
  removeCustomerAddress,
  saveCustomerProfile,
  setCustomerBlocked,
} from "@/server/admin/customers";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  addressIdSchema,
  addressSchema,
  blockSchema,
  customerProfileSchema,
} from "@/lib/validation/admin-customers";

function refreshCustomer(id: string): void {
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

export async function saveCustomerAction(input: {
  customerId: string;
  notes: string;
  tags: string;
}): Promise<ActionResult> {
  const session = await requireCustomers();
  try {
    const parsed = customerProfileSchema.parse(input);
    await saveCustomerProfile(
      session.userId,
      parsed.customerId,
      parsed.notes,
      parsed.tags,
    );
    refreshCustomer(parsed.customerId);
    return { ok: true, message: "Customer saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function blockCustomerAction(input: {
  customerId: string;
  blocked: boolean;
}): Promise<ActionResult> {
  const session = await requireCustomers();
  try {
    const parsed = blockSchema.parse(input);
    await setCustomerBlocked(session.userId, parsed.customerId, parsed.blocked);
    refreshCustomer(parsed.customerId);
    return {
      ok: true,
      message: parsed.blocked ? "Customer blocked." : "Customer unblocked.",
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function addAddressAction(input: {
  customerId: string;
  name: string;
  phone: string;
  line1: string;
  area: string;
  city: string;
  label: string;
  isDefault: boolean;
}): Promise<ActionResult> {
  const session = await requireCustomers();
  try {
    const parsed = addressSchema.parse(input);
    await addCustomerAddress(session.userId, parsed);
    refreshCustomer(parsed.customerId);
    return { ok: true, message: "Address saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function removeAddressAction(input: {
  customerId: string;
  addressId: string;
}): Promise<ActionResult> {
  const session = await requireCustomers();
  try {
    const parsed = addressIdSchema.parse(input);
    await removeCustomerAddress(session.userId, parsed.customerId, parsed.addressId);
    refreshCustomer(parsed.customerId);
    return { ok: true, message: "Address removed." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
