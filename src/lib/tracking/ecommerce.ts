import { variantLabel, variantPrice } from "@/lib/catalog/pricing";
import type { TrackName } from "@/lib/tracking/names";
import type { Product, ProductVariant } from "@/types/catalog";

export const TRACKING_CURRENCY = "BDT";
export const TRACKING_AFFILIATION = "UniBaazar";

/** `id` is the variant SKU: the same id the Meta/Google catalog feeds publish. */
export type TrackItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  brand?: string;
  /** Top level first; GA4 takes up to five. */
  categories?: string[];
  variant?: string;
};

export type TrackData = {
  items?: TrackItem[];
  value?: number;
  currency?: string;
  transactionId?: string;
  coupon?: string;
  shipping?: number;
  tax?: number;
  paymentType?: string;
  shippingTier?: string;
  listName?: string;
  slug?: string;
  searchTerm?: string;
  resultCount?: number;
  method?: string;
  channel?: string;
  path?: string;
  title?: string;
  url?: string;
};

export function productTrackItem(
  product: Pick<Product, "name" | "brandName" | "categoryPath">,
  variant: ProductVariant,
  quantity = 1,
): TrackItem {
  const label = variantLabel(variant);
  return {
    id: variant.sku,
    name: product.name,
    price: variantPrice(variant),
    quantity,
    ...(product.brandName ? { brand: product.brandName } : {}),
    ...(product.categoryPath?.length ? { categories: product.categoryPath } : {}),
    ...(label ? { variant: label } : {}),
  };
}

export function itemsValue(items: TrackItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function eventValue(data: TrackData): number | undefined {
  return data.value ?? (data.items?.length ? itemsValue(data.items) : undefined);
}

function compact<T extends Record<string, unknown>>(row: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(row).filter(([, value]) => value !== undefined && value !== ""),
  ) as Partial<T>;
}

const ga4Names: Record<TrackName, string> = {
  PageView: "page_view",
  ViewItemList: "view_item_list",
  SelectItem: "select_item",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  RemoveFromCart: "remove_from_cart",
  ViewCart: "view_cart",
  AddToWishlist: "add_to_wishlist",
  InitiateCheckout: "begin_checkout",
  AddShippingInfo: "add_shipping_info",
  AddPaymentInfo: "add_payment_info",
  Purchase: "purchase",
  Search: "search",
  CompleteRegistration: "sign_up",
  Login: "login",
  Lead: "generate_lead",
};

const ga4Ecommerce: readonly TrackName[] = [
  "ViewItemList",
  "SelectItem",
  "ViewContent",
  "AddToCart",
  "RemoveFromCart",
  "ViewCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddShippingInfo",
  "AddPaymentInfo",
  "Purchase",
];

const categoryKeys = [
  "item_category",
  "item_category2",
  "item_category3",
  "item_category4",
  "item_category5",
];

function ga4Item(
  item: TrackItem,
  index: number,
  data: TrackData,
): Record<string, unknown> {
  return compact({
    item_id: item.id,
    item_name: item.name,
    affiliation: TRACKING_AFFILIATION,
    coupon: data.coupon,
    index,
    item_brand: item.brand,
    ...Object.fromEntries(
      (item.categories ?? []).slice(0, 5).map((name, at) => [categoryKeys[at], name]),
    ),
    item_list_name: data.listName,
    item_variant: item.variant,
    price: item.price,
    quantity: item.quantity,
  });
}

/** GA4's recommended event name and parameters, shared by gtag and the GTM data layer. */
export function toGa4(
  name: TrackName,
  data: TrackData,
): { event: string; params: Record<string, unknown>; ecommerce: boolean } {
  const ecommerce = ga4Ecommerce.includes(name);
  const params = ecommerce
    ? compact({
        currency: data.currency ?? TRACKING_CURRENCY,
        value: eventValue(data),
        transaction_id: data.transactionId,
        tax: name === "Purchase" ? (data.tax ?? 0) : undefined,
        shipping: data.shipping,
        coupon: data.coupon,
        payment_type: data.paymentType,
        shipping_tier: data.shippingTier,
        item_list_name: data.listName,
        items: data.items?.map((item, index) => ga4Item(item, index, data)),
      })
    : compact({
        search_term: data.searchTerm,
        method: data.method,
        channel: data.channel,
        page_path: data.path,
        page_title: data.title,
        page_location: data.url,
      });
  return { event: ga4Names[name], params, ecommerce };
}

const metaNames: Partial<Record<TrackName, string>> = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  AddToWishlist: "AddToWishlist",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "Purchase",
  Search: "Search",
  CompleteRegistration: "CompleteRegistration",
  Lead: "Lead",
};

/** Meta standard event, or null for events Meta has no standard name for. */
export function toMeta(
  name: TrackName,
  data: TrackData,
): { event: string; params: Record<string, unknown> } | null {
  const event = metaNames[name];
  if (!event) {
    return null;
  }
  const items = data.items ?? [];
  const params = compact({
    currency:
      items.length || data.value ? (data.currency ?? TRACKING_CURRENCY) : undefined,
    value: eventValue(data),
    content_type: items.length ? "product" : undefined,
    content_ids: items.length ? items.map((item) => item.id) : undefined,
    content_name: items.length === 1 ? items[0].name : undefined,
    contents: items.length
      ? items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          item_price: item.price,
        }))
      : undefined,
    num_items: items.length
      ? items.reduce((sum, item) => sum + item.quantity, 0)
      : undefined,
    search_string: data.searchTerm,
    order_id: data.transactionId,
  });
  return { event, params };
}

const tiktokNames: Partial<Record<TrackName, string>> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  AddToWishlist: "AddToWishlist",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "CompletePayment",
  Search: "Search",
  CompleteRegistration: "CompleteRegistration",
  Lead: "Contact",
};

/** TikTok standard event, or null when TikTok has no equivalent (PageView uses ttq.page()). */
export function toTiktok(
  name: TrackName,
  data: TrackData,
): { event: string; params: Record<string, unknown> } | null {
  const event = tiktokNames[name];
  if (!event) {
    return null;
  }
  const items = data.items ?? [];
  const params = compact({
    currency:
      items.length || data.value ? (data.currency ?? TRACKING_CURRENCY) : undefined,
    value: eventValue(data),
    content_type: items.length ? "product" : undefined,
    contents: items.length
      ? items.map((item) => ({
          content_id: item.id,
          content_type: "product",
          content_name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))
      : undefined,
    query: data.searchTerm,
  });
  return { event, params };
}

const pinterestNames: Partial<Record<TrackName, string>> = {
  ViewContent: "pagevisit",
  ViewItemList: "viewcategory",
  AddToCart: "addtocart",
  Purchase: "checkout",
  Search: "search",
  CompleteRegistration: "signup",
  Lead: "lead",
};

export function toPinterest(
  name: TrackName,
  data: TrackData,
  eventId: string,
): { event: string; params: Record<string, unknown> } | null {
  const event = pinterestNames[name];
  if (!event) {
    return null;
  }
  const items = data.items ?? [];
  return {
    event,
    params: compact({
      event_id: eventId,
      currency: data.currency ?? TRACKING_CURRENCY,
      value: eventValue(data),
      order_id: data.transactionId,
      order_quantity: items.length
        ? items.reduce((sum, item) => sum + item.quantity, 0)
        : undefined,
      search_query: data.searchTerm,
      line_items: items.length
        ? items.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            product_price: item.price,
            product_quantity: item.quantity,
          }))
        : undefined,
    }),
  };
}

const snapNames: Partial<Record<TrackName, string>> = {
  ViewContent: "VIEW_CONTENT",
  AddToCart: "ADD_CART",
  AddToWishlist: "ADD_TO_WISHLIST",
  InitiateCheckout: "START_CHECKOUT",
  AddPaymentInfo: "ADD_BILLING",
  Purchase: "PURCHASE",
  Search: "SEARCH",
  CompleteRegistration: "SIGN_UP",
};

export function toSnap(
  name: TrackName,
  data: TrackData,
  eventId: string,
): { event: string; params: Record<string, unknown> } | null {
  const event = snapNames[name];
  if (!event) {
    return null;
  }
  const items = data.items ?? [];
  return {
    event,
    params: compact({
      client_dedup_id: eventId,
      currency: data.currency ?? TRACKING_CURRENCY,
      price: eventValue(data),
      transaction_id: data.transactionId,
      item_ids: items.length ? items.map((item) => item.id) : undefined,
      number_items: items.length
        ? items.reduce((sum, item) => sum + item.quantity, 0)
        : undefined,
      search_string: data.searchTerm,
    }),
  };
}

/**
 * The flat row Admin → Analytics reads back out of TrackingEvent: `slug` for
 * product performance, `query`/`resultCount` for search terms, `path` for
 * traffic. Keep these keys in step with src/server/admin/analytics.ts.
 */
export function firstPartyPayload(data: TrackData): Record<string, string | number> {
  const value = eventValue(data);
  return compact({
    slug: data.slug,
    query: data.searchTerm,
    resultCount: data.resultCount,
    value,
    currency: value === undefined ? undefined : (data.currency ?? TRACKING_CURRENCY),
    method: data.method ?? data.paymentType,
    channel: data.channel,
    path: data.path,
  }) as Record<string, string | number>;
}
