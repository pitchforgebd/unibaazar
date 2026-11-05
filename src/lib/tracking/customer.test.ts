import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { internationalPhone, purchaseCustomer } from "@/lib/tracking/customer";
import type { Order } from "@/types/catalog";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

const order = {
  name: "Azmir Uddin",
  phone: "01829317005",
  email: " Parent@Example.COM ",
  address: "House 1, Road 1, Dhanmondi",
  area: "inside-dhaka",
} as Order;

describe("internationalPhone", () => {
  it("adds 880 and drops the leading zero", () => {
    expect(internationalPhone("01829317005")).toBe("8801829317005");
    expect(internationalPhone("+880 1829-317005")).toBe("8801829317005");
  });
});

describe("purchaseCustomer", () => {
  it("gives each field as entered and a hash of its normalised form", async () => {
    const customer = await purchaseCustomer(order);
    expect(customer).toEqual({
      name: "Azmir Uddin",
      name_hash: sha("azmir uddin"),
      phone: "01829317005",
      phone_hash: sha("8801829317005"),
      email: "Parent@Example.COM",
      email_hash: sha("parent@example.com"),
      address: "House 1, Road 1, Dhanmondi",
      address_hash: sha("house 1, road 1, dhanmondi"),
      city: "Dhaka",
      city_hash: sha("dhaka"),
      country: "BD",
      country_hash: sha("bd"),
    });
  });

  it("leaves out what the shopper didn't give, and the city outside Dhaka", async () => {
    const customer = await purchaseCustomer({
      ...order,
      email: "",
      area: "outside-dhaka",
    });
    expect(customer.email).toBeUndefined();
    expect(customer.city).toBeUndefined();
  });
});
