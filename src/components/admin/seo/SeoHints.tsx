"use client";

import { CircleAlert } from "lucide-react";
import { seoHints } from "@/lib/seo/score";

export function SeoHints(props: {
  title: string;
  description: string;
  h1: string;
  focusKeyword?: string;
  alts?: string[];
}) {
  const hints = seoHints(props);
  if (hints.length === 0) {
    return null;
  }
  return (
    <ul className="space-y-1.5 text-sm text-muted">
      {hints.map((hint) => (
        <li key={hint} className="flex items-start gap-1.5">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          <span>{hint}</span>
        </li>
      ))}
    </ul>
  );
}
