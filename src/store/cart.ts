"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartLine, DeliveryArea, Product } from "@/types/catalog";

type AddResult = "added" | "out-of-stock";

type CartState = {
  lines: CartLine[];
  couponCode: string | null;
  couponDiscount: number;
  /** Opaque id this cart quotes/places its order under, so checkout can
   * hold stock between a quote and the final order placement (see
   * src/modules/inventory). Regenerated on clear() so a fresh cart never
   * reuses a token a previous order may have already consumed. */
  reservationToken: string;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addLine: (line: CartLine) => Promise<AddResult>;
  setQty: (slug: string, variantId: string, qty: number) => Promise<void>;
  removeLine: (slug: string, variantId: string) => void;
  applyCoupon: (code: string) => Promise<string | null>;
  clearCoupon: () => void;
  clear: () => void;
  refreshCoupon: () => Promise<void>;
};

function newReservationToken(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `rt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function lineKey(line: Pick<CartLine, "slug" | "variantId">): string {
  return `${line.slug}:${line.variantId}`;
}

// Resolves against the real database via the same /api/v1/products/[slug]
// endpoint the storefront's product pages use (see useResolvedProducts),
// not a hardcoded mock catalog. Plain fetch rather than that hook because
// Zustand actions aren't React components — they can't call hooks.
async function stockFor(line: Pick<CartLine, "slug" | "variantId">): Promise<number> {
  try {
    const response = await fetch(`/api/v1/products/${line.slug}`);
    if (!response.ok) {
      return 0;
    }
    const body: unknown = await response.json();
    const record = typeof body === "object" && body !== null ? body : {};
    const product = "data" in record ? (record.data as Product) : null;
    const variant = product?.variants.find((item) => item.id === line.variantId);
    return variant?.stock ?? 0;
  } catch {
    return 0;
  }
}

async function quoteDiscount(
  lines: CartLine[],
  couponCode: string,
  area: DeliveryArea,
): Promise<{ ok: true; discount: number } | { ok: false; message: string }> {
  try {
    const response = await fetch("/api/v1/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, couponCode, area }),
    });
    const body: unknown = await response.json().catch(() => null);
    const record = typeof body === "object" && body !== null ? body : {};
    if (!response.ok) {
      const message =
        "error" in record && typeof record.error === "string"
          ? record.error
          : "That coupon is not valid";
      return { ok: false, message };
    }
    const data = "data" in record ? record.data : null;
    const discount =
      data &&
      typeof data === "object" &&
      "discount" in data &&
      typeof data.discount === "number"
        ? data.discount
        : 0;
    return { ok: true, discount };
  } catch {
    return { ok: false, message: "Could not check that coupon right now" };
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      couponCode: null,
      couponDiscount: 0,
      reservationToken: newReservationToken(),
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addLine: async (line) => {
        const stock = await stockFor(line);
        if (stock <= 0) {
          return "out-of-stock";
        }
        set((state) => {
          const existing = state.lines.find((item) => lineKey(item) === lineKey(line));
          if (!existing) {
            return {
              lines: [...state.lines, { ...line, qty: Math.min(line.qty, stock) }],
            };
          }
          return {
            lines: state.lines.map((item) =>
              lineKey(item) === lineKey(line)
                ? { ...item, qty: Math.min(item.qty + line.qty, stock) }
                : item,
            ),
          };
        });
        void get().refreshCoupon();
        return "added";
      },
      setQty: async (slug, variantId, qty) => {
        const stock = await stockFor({ slug, variantId });
        set((state) => ({
          lines: state.lines.flatMap((item) => {
            if (lineKey(item) !== lineKey({ slug, variantId })) {
              return [item];
            }
            if (qty <= 0 || stock <= 0) {
              return [];
            }
            return [{ ...item, qty: Math.min(qty, stock) }];
          }),
        }));
        void get().refreshCoupon();
      },
      removeLine: (slug, variantId) => {
        set((state) => ({
          lines: state.lines.filter((item) => lineKey(item) !== `${slug}:${variantId}`),
        }));
        void get().refreshCoupon();
      },
      applyCoupon: async (code) => {
        const result = await quoteDiscount(get().lines, code, "inside-dhaka");
        if (!result.ok) {
          return result.message;
        }
        set({ couponCode: code.trim().toUpperCase(), couponDiscount: result.discount });
        return null;
      },
      clearCoupon: () => set({ couponCode: null, couponDiscount: 0 }),
      clear: () =>
        set({
          lines: [],
          couponCode: null,
          couponDiscount: 0,
          reservationToken: newReservationToken(),
        }),
      refreshCoupon: async () => {
        const { lines, couponCode } = get();
        if (!couponCode) {
          return;
        }
        if (lines.length === 0) {
          set({ couponCode: null, couponDiscount: 0 });
          return;
        }
        const result = await quoteDiscount(lines, couponCode, "inside-dhaka");
        set(
          result.ok
            ? { couponDiscount: result.discount }
            : { couponCode: null, couponDiscount: 0 },
        );
      },
    }),
    {
      name: "unibaazar:cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        lines: state.lines,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
        reservationToken: state.reservationToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function useCartCount(): number {
  return useCartStore((state) => state.lines.reduce((sum, line) => sum + line.qty, 0));
}

export function useCartHydrated(): boolean {
  return useCartStore((state) => state.hasHydrated);
}
