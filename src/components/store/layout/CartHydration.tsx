"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";

export function CartHydration() {
  useEffect(() => {
    void Promise.resolve(useCartStore.persist.rehydrate()).finally(() => {
      useCartStore.getState().setHasHydrated(true);
    });
  }, []);

  return null;
}
