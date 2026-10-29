import { describe, expect, it } from "vitest";
import { needsUnicode } from "./bulksmsbd";

describe("needsUnicode", () => {
  it("plain English/GSM-7 text does not need unicode mode", () => {
    expect(needsUnicode("Your UniBaazar login code is 123456.")).toBe(false);
    expect(needsUnicode("Hi John, order UB1001 is now Shipped. Total 1,250.00.")).toBe(
      false,
    );
  });

  it("GSM-7's own extended-but-included characters still count as text", () => {
    expect(needsUnicode("Café price: £5 or €6, call for ¿questions?")).toBe(false);
  });

  it("Bengali text needs unicode mode", () => {
    expect(needsUnicode("আপনার লগইন কোড ১২৩৪৫৬।")).toBe(true);
  });

  it("a GSM-7 message with one Bengali character embedded still needs unicode", () => {
    expect(needsUnicode("Hi নাম, your order is ready.")).toBe(true);
  });

  it("emoji and other non-GSM-7 symbols need unicode mode", () => {
    expect(needsUnicode("Order confirmed ✅")).toBe(true);
  });
});
