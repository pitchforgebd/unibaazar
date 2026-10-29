import { describe, expect, it } from "vitest";
import { brandedEmailHtml } from "./template";

describe("brandedEmailHtml", () => {
  it("renders the body as separate paragraphs split on blank lines", () => {
    const html = brandedEmailHtml("Hello John,\n\nYour order shipped.");
    expect(html).toContain("<p");
    expect(html).toContain(">Hello John,</p>");
    expect(html).toContain(">Your order shipped.</p>");
  });

  it("keeps a single newline within one paragraph as a <br>", () => {
    const html = brandedEmailHtml("Total: 500\nTracking: UB1");
    expect(html).toContain("Total: 500<br>Tracking: UB1");
  });

  it("escapes HTML in the body instead of injecting it", () => {
    // order.name is customer-entered at checkout and flows straight into
    // this template via notify.ts's fillTemplate — must not be renderable.
    const html = brandedEmailHtml("Hi <script>alert(1)</script>,\n\nThanks.");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders Bengali body text unescaped-but-safe", () => {
    const html = brandedEmailHtml("আপনার অর্ডার পাঠানো হয়েছে।");
    expect(html).toContain("আপনার অর্ডার পাঠানো হয়েছে।");
  });

  it("includes an action button only when one is passed", () => {
    const withAction = brandedEmailHtml("Body", {
      label: "Track your order",
      href: "https://unibaazar.com/track-order?order=UB1",
    });
    expect(withAction).toContain("Track your order");
    expect(withAction).toContain("https://unibaazar.com/track-order?order=UB1");

    const withoutAction = brandedEmailHtml("Body");
    expect(withoutAction).not.toContain("<a href");
  });

  it("escapes the action href and label", () => {
    const html = brandedEmailHtml("Body", {
      label: "<b>Click</b>",
      href: "https://example.com/?a=1&b=2",
    });
    expect(html).not.toContain("<b>Click</b>");
    expect(html).toContain("&amp;b=2");
  });
});
