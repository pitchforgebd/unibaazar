import { describe, expect, it } from "vitest";
import {
  firstPartyPayload,
  toGa4,
  toMeta,
  toPinterest,
  toSnap,
  toTiktok,
  type TrackItem,
} from "@/lib/tracking/ecommerce";

const book: TrackItem = {
  id: "SKU-1",
  name: "Story Book",
  price: 500,
  quantity: 2,
  brand: "Ayan",
  categories: ["Book", "Story books"],
};
const toy: TrackItem = { id: "SKU-2", name: "Toy Car", price: 300, quantity: 1 };

describe("toGa4", () => {
  it("builds GA4's add_to_cart shape, deriving value from the items", () => {
    expect(toGa4("AddToCart", { items: [book] })).toEqual({
      event: "add_to_cart",
      ecommerce: true,
      params: {
        currency: "BDT",
        value: 1000,
        items: [
          {
            item_id: "SKU-1",
            item_name: "Story Book",
            affiliation: "UniBaazar",
            index: 0,
            item_brand: "Ayan",
            item_category: "Book",
            item_category2: "Story books",
            price: 500,
            quantity: 2,
          },
        ],
      },
    });
  });

  it("carries transaction_id, shipping and coupon on purchase", () => {
    const { event, params } = toGa4("Purchase", {
      items: [book, toy],
      value: 1350,
      transactionId: "UB-1001",
      shipping: 60,
      coupon: "EID10",
    });
    expect(event).toBe("purchase");
    expect(params).toMatchObject({
      transaction_id: "UB-1001",
      value: 1350,
      shipping: 60,
      coupon: "EID10",
      currency: "BDT",
    });
  });

  it("sends tax on purchase, and puts the coupon and list on every item", () => {
    const { params } = toGa4("Purchase", { items: [toy], coupon: "EID10" });
    expect(params.tax).toBe(0);
    expect((params.items as Record<string, unknown>[])[0]).toMatchObject({
      coupon: "EID10",
      affiliation: "UniBaazar",
    });
    const list = toGa4("ViewItemList", { items: [toy], listName: "Shop" });
    expect((list.params.items as Record<string, unknown>[])[0].item_list_name).toBe(
      "Shop",
    );
    expect(toGa4("AddToCart", { items: [toy] }).params.tax).toBeUndefined();
  });

  it("keeps non-ecommerce events flat", () => {
    expect(toGa4("Search", { searchTerm: "lego", resultCount: 0 })).toEqual({
      event: "search",
      ecommerce: false,
      params: { search_term: "lego" },
    });
  });
});

describe("toMeta", () => {
  it("builds the content fields catalog ads need, using the feed's SKU ids", () => {
    expect(toMeta("AddToCart", { items: [book] })).toEqual({
      event: "AddToCart",
      params: {
        currency: "BDT",
        value: 1000,
        content_type: "product",
        content_ids: ["SKU-1"],
        content_name: "Story Book",
        contents: [{ id: "SKU-1", quantity: 2, item_price: 500 }],
        num_items: 2,
      },
    });
  });

  it("uses search_string for Search", () => {
    expect(toMeta("Search", { searchTerm: "lego" })?.params).toEqual({
      search_string: "lego",
    });
  });

  it("returns null for events with no Meta standard name", () => {
    expect(toMeta("RemoveFromCart", { items: [book] })).toBeNull();
    expect(toMeta("ViewCart", { items: [book] })).toBeNull();
  });
});

describe("toTiktok", () => {
  it("maps Purchase to CompletePayment with contents", () => {
    expect(toTiktok("Purchase", { items: [toy], value: 300 })).toEqual({
      event: "CompletePayment",
      params: {
        currency: "BDT",
        value: 300,
        content_type: "product",
        contents: [
          {
            content_id: "SKU-2",
            content_type: "product",
            content_name: "Toy Car",
            quantity: 1,
            price: 300,
          },
        ],
      },
    });
  });

  it("uses query for Search and leaves PageView to ttq.page()", () => {
    expect(toTiktok("Search", { searchTerm: "doll" })?.params).toEqual({ query: "doll" });
    expect(toTiktok("PageView", {})).toBeNull();
  });
});

describe("toPinterest and toSnap", () => {
  it("passes the shared event id so each platform can deduplicate", () => {
    expect(toPinterest("Purchase", { items: [toy] }, "evt-1")?.params.event_id).toBe(
      "evt-1",
    );
    expect(toSnap("Purchase", { items: [toy] }, "evt-1")?.params.client_dedup_id).toBe(
      "evt-1",
    );
  });

  it("uses each platform's own event names", () => {
    expect(toPinterest("AddToCart", { items: [toy] }, "e")?.event).toBe("addtocart");
    expect(toSnap("InitiateCheckout", { items: [toy] }, "e")?.event).toBe(
      "START_CHECKOUT",
    );
  });
});

describe("firstPartyPayload", () => {
  it("keeps the keys Admin → Analytics reads", () => {
    expect(firstPartyPayload({ slug: "story-book", items: [book] })).toEqual({
      slug: "story-book",
      value: 1000,
      currency: "BDT",
    });
    expect(firstPartyPayload({ searchTerm: "lego", resultCount: 0 })).toEqual({
      query: "lego",
      resultCount: 0,
    });
  });
});
