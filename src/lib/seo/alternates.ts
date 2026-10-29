import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo/urls";

// hreflang + x-default for a given canonical (locale-less) path, e.g. "/shop".
// Phase 2 moved locale to the URL (`/bn/...`) instead of a cookie, so every
// indexable page now has a real, distinct URL per locale worth pointing
// search engines at — see docs/decisions and ARCHITECTURE.md §11.
//
// Split out of urls.ts (Phase 11) so absoluteUrl() itself carries no
// next-intl import — next-intl's navigation module pulls in
// next/navigation in a way vitest's plain-node environment can't
// resolve, which made every file importing absoluteUrl (including
// lib/seo/schema.ts's JSON-LD builders) untestable until this split.
export function localeAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(getPathname({ href: path, locale }));
  }
  languages["x-default"] = absoluteUrl(path);
  return languages;
}
