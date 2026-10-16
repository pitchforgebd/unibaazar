import type { Order } from "@/types/catalog";

const storageKey = "unibaazar:orders";

export function isStoredOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && Array.isArray(record.items);
}

export function readPlacedOrders(): Order[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = window.sessionStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isStoredOrder);
  } catch {
    return [];
  }
}

export function savePlacedOrder(order: Order): void {
  const orders = [order, ...readPlacedOrders().filter((item) => item.id !== order.id)];
  window.sessionStorage.setItem(storageKey, JSON.stringify(orders));
}

export function findPlacedOrder(id: string, phone?: string): Order | undefined {
  return readPlacedOrders().find((order) => {
    const idMatch = order.id.toLowerCase() === id.toLowerCase();
    if (!phone) {
      return idMatch;
    }
    return idMatch && order.phone === phone;
  });
}
