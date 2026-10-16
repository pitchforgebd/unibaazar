import { track } from "@/lib/tracking/browser";

export function trackPurchase(order: { id: string; total: number }): void {
  if (typeof window === "undefined") {
    return;
  }
  track("Purchase", { value: order.total, currency: "BDT" }, order.id);
  window.dispatchEvent(
    new CustomEvent("unibaazar:purchase", {
      detail: { id: order.id, total: order.total },
    }),
  );
}
