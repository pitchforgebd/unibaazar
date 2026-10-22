import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

// hreflang + x-default for a given canonical (locale-less) path, e.g. "/shop".
// Phase 2 moved locale to the URL (`/bn/...`) instead of a cookie, so every
// indexable page now has a real, distinct URL per locale worth pointing
// search engines at — see docs/decisions and ARCHITECTURE.md §11.
export function localeAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(getPathname({ href: path, locale }));
  }
  languages["x-default"] = absoluteUrl(path);
  return languages;
}
