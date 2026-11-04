"use client";

import type { MouseEvent, ReactNode } from "react";
import { track } from "@/lib/tracking/browser";
import type { TrackItem } from "@/lib/tracking/ecommerce";

type ListedProduct = { slug: string; item: TrackItem };

/** Reports GA4's select_item when a shopper opens a product from this list. */
export function SelectItemTracker({
  listName,
  products,
  children,
}: {
  listName: string;
  products: ListedProduct[];
  children: ReactNode;
}) {
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");
    const slug = link?.getAttribute("href")?.split("/product/")[1];
    const match = slug ? products.find((product) => product.slug === slug) : undefined;
    if (match) {
      track("SelectItem", { listName, slug: match.slug, items: [match.item] });
    }
  }
  return <div onClickCapture={onClick}>{children}</div>;
}
