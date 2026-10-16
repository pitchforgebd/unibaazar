"use client";

import { create } from "zustand";

type WishlistState = {
  slugs: string[];
  toggle: (slug: string) => void;
  has: (slug: string) => boolean;
};

export const useWishlistStore = create<WishlistState>((set, get) => ({
  slugs: ["redmi-buds-4"],
  toggle: (slug) => {
    set((state) => ({
      slugs: state.slugs.includes(slug)
        ? state.slugs.filter((item) => item !== slug)
        : [...state.slugs, slug],
    }));
  },
  has: (slug) => get().slugs.includes(slug),
}));

type CompareState = {
  slugs: string[];
  toggle: (slug: string) => void;
};

export const useCompareStore = create<CompareState>((set) => ({
  slugs: [],
  toggle: (slug) => {
    set((state) => {
      if (state.slugs.includes(slug)) {
        return { slugs: state.slugs.filter((item) => item !== slug) };
      }
      if (state.slugs.length >= 3) {
        return { slugs: [...state.slugs.slice(1), slug] };
      }
      return { slugs: [...state.slugs, slug] };
    });
  },
}));
