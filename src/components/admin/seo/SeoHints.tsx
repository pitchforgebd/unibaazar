"use client";

import { seoHints } from "@/lib/seo/score";

export function SeoHints(props: {
  title: string;
  description: string;
  h1: string;
  focusKeyword?: string;
  alts?: string[];
}) {
  return (
    <ul className="space-y-1 text-sm text-muted">
      {seoHints(props).map((hint) => (
        <li key={hint}>{hint}</li>
      ))}
    </ul>
  );
}
