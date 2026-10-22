"use client";

import { useEffect, useState } from "react";
import type { CartLine, DeliveryArea } from "@/types/catalog";

export type CheckoutQuote = {
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
};

type QuoteState = {
  byArea: Partial<Record<DeliveryArea, CheckoutQuote>>;
  loading: boolean;
  error: string | null;
};

const AREAS: DeliveryArea[] = ["inside-dhaka", "outside-dhaka"];

async function fetchQuote(
  lines: CartLine[],
  couponCode: string | null,
  area: DeliveryArea,
  reservationToken: string | null,
): Promise<
  { area: DeliveryArea; quote: CheckoutQuote } | { area: DeliveryArea; error: string }
> {
  try {
    const response = await fetch("/api/v1/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines,
        area,
        couponCode: couponCode || undefined,
        ...(reservationToken ? { reservationToken } : {}),
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    const record = typeof body === "object" && body !== null ? body : {};
    if (!response.ok) {
      const message =
        "error" in record && typeof record.error === "string"
          ? record.error
          : "Could not price this order";
      return { area, error: message };
    }
    const data = "data" in record ? record.data : null;
    if (
      !data ||
      typeof data !== "object" ||
      !("subtotal" in data) ||
      !("discount" in data) ||
      !("deliveryCharge" in data) ||
      !("total" in data)
    ) {
      return { area, error: "Could not price this order" };
    }
    return {
      area,
      quote: {
        subtotal: Number(data.subtotal),
        discount: Number(data.discount),
        deliveryCharge: Number(data.deliveryCharge),
        total: Number(data.total),
      },
    };
  } catch {
    return { area, error: "Could not price this order" };
  }
}

/**
 * The checkout page's own live price, fetched from the same
 * /api/v1/cart/quote endpoint that will actually be re-quoted at order
 * placement — so what the customer sees here is never out of sync with
 * what src/server/orders/orders.ts charges (the bug this closes: the old
 * client-side summarizeCart() used a hardcoded delivery table that could
 * silently disagree with admin-set delivery settings). Quotes both areas
 * at once so the per-area radio labels stay accurate without a second
 * round trip when the customer switches area.
 */
export function useCheckoutQuote(
  lines: CartLine[],
  couponCode: string | null,
  selectedArea: DeliveryArea,
  reservationToken: string,
): QuoteState {
  const [state, setState] = useState<QuoteState>({
    byArea: {},
    loading: false,
    error: null,
  });
  const key = JSON.stringify({ lines, couponCode, selectedArea });

  useEffect(() => {
    if (lines.length === 0) {
      setState({ byArea: {}, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    // Only the selected area's quote holds stock — quoting the other area
    // too (for its delivery-charge label) shouldn't churn the reservation
    // for a price the customer isn't about to pay.
    Promise.all(
      AREAS.map((area) =>
        fetchQuote(
          lines,
          couponCode,
          area,
          area === selectedArea ? reservationToken : null,
        ),
      ),
    ).then((results) => {
      if (cancelled) return;
      const byArea: QuoteState["byArea"] = {};
      let error: string | null = null;
      for (const result of results) {
        if ("quote" in result) {
          byArea[result.area] = result.quote;
        } else {
          error = result.error;
        }
      }
      setState({ byArea, loading: false, error });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is lines+couponCode, deliberately not reservationToken (that never changes mid-session)
  }, [key]);

  return state;
}
