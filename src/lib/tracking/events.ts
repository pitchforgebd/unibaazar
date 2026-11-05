import { track } from "@/lib/tracking/browser";
import type { Order } from "@/types/catalog";

const trackedKey = "unibaazar:tracked-orders";

function alreadyTracked(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(trackedKey);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(ids) && ids.includes(id)) {
      return true;
    }
    const next = [id, ...(Array.isArray(ids) ? ids : [])].slice(0, 50);
    window.localStorage.setItem(trackedKey, JSON.stringify(next));
    return false;
  } catch {
    return false;
  }
}

/** Reloading the order page must not report the sale a second time. */
export function trackPurchase(order: Order): void {
  if (typeof window === "undefined" || alreadyTracked(order.id)) {
    return;
  }
  track(
    "Purchase",
    {
      transactionId: order.id,
      value: order.total,
      shipping: order.deliveryCharge,
      coupon: order.couponCode,
      paymentType: order.paymentMethod,
      items: order.items.map((item) => ({
        id: item.sku,
        name: item.name,
        price: item.unitPrice,
        quantity: item.qty,
      })),
    },
    order.id,
  );
  window.dispatchEvent(
    new CustomEvent("unibaazar:purchase", {
      detail: { id: order.id, total: order.total },
    }),
  );
}
