import type { Order } from "@/types/catalog";

export type TrackCustomer = Record<string, string>;

/** 01XXXXXXXXX → 8801XXXXXXXXX: the form Meta and Google match phone numbers on. */
export function internationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  return digits.startsWith("880") ? digits : `880${digits}`;
}

/** Each field as entered, plus the trimmed, lowercased form that gets hashed. */
export function customerFields(
  order: Order,
): Record<string, { value: string; hashed: string }> {
  const fields: Record<string, { value: string; hashed: string }> = {};
  const add = (key: string, value: string, hashed = value.trim().toLowerCase()) => {
    if (value.trim()) {
      fields[key] = { value: value.trim(), hashed };
    }
  };
  add("name", order.name);
  add("phone", order.phone, internationalPhone(order.phone));
  add("email", order.email);
  add("address", order.address);
  if (order.area === "inside-dhaka") {
    add("city", "Dhaka");
  }
  add("country", "BD", "bd");
  return fields;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * The buyer's details for GTM, each with a SHA-256 hash for Meta and Google
 * Ads tags to send. Only ever placed in the data layer, never in a GA4 event:
 * Google doesn't allow personal data in GA4.
 */
export async function purchaseCustomer(order: Order): Promise<TrackCustomer> {
  const customer: TrackCustomer = {};
  for (const [key, field] of Object.entries(customerFields(order))) {
    customer[key] = field.value;
    customer[`${key}_hash`] = await sha256(field.hashed);
  }
  return customer;
}
