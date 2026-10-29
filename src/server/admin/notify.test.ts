import { describe, expect, it } from "vitest";
import { defaults, fillTemplate } from "@/server/admin/notify";

describe("fillTemplate", () => {
  it("replaces every {placeholder} with its value", () => {
    const result = fillTemplate("Hi {name}, order {order_id} is {status}.", {
      name: "Rahim",
      order_id: "UB1001",
      status: "shipped",
    });
    expect(result).toBe("Hi Rahim, order UB1001 is shipped.");
  });

  it("renders correctly with Bengali values substituted into an English template", () => {
    const result = fillTemplate("Hi {name}, your order {order_id} is {status}.", {
      name: "রহিম আহমেদ",
      order_id: "UB1001",
      status: "পাঠানো হয়েছে",
    });
    expect(result).toBe("Hi রহিম আহমেদ, your order UB1001 is পাঠানো হয়েছে.");
  });

  it("renders correctly with a fully Bengali template", () => {
    const result = fillTemplate("হাই {name}, আপনার অর্ডার {order_id} এখন {status}।", {
      name: "রহিম আহমেদ",
      order_id: "UB1001",
      status: "পাঠানো হয়েছে",
    });
    expect(result).toBe("হাই রহিম আহমেদ, আপনার অর্ডার UB1001 এখন পাঠানো হয়েছে।");
  });

  it("leaves an unmatched placeholder's key out, substituting an empty string", () => {
    const result = fillTemplate("Tracking: {tracking}", {});
    expect(result).toBe("Tracking: ");
  });

  it("doesn't touch text that isn't a {placeholder}", () => {
    const result = fillTemplate("Total ৳1,250.00 — no braces here", { total: "ignored" });
    expect(result).toBe("Total ৳1,250.00 — no braces here");
  });

  it("the default order-status templates render cleanly in a realistic case", () => {
    const values = {
      name: "Rahim Ahmed",
      order_id: "UB1001",
      status: "shipped",
      total: "৳1,250.00",
      tracking: "SF123456BD",
    };
    expect(fillTemplate(defaults.sms, values)).toContain("UB1001");
    expect(fillTemplate(defaults.sms, values)).toContain("shipped");
    expect(fillTemplate(defaults.emailBody, values)).toContain("৳1,250.00");
  });
});
