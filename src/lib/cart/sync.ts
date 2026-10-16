import type { CartLine } from "@/types/catalog";

export type CartSnapshot = {
  lines: CartLine[];
  couponCode: string | null;
};

export function syncCartOnLogin(snapshot: CartSnapshot): CartSnapshot {
  return snapshot;
}
