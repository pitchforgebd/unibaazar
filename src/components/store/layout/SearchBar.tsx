"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Product } from "@/types/catalog";

type SearchBarProps = {
  id: string;
  initialQuery?: string;
};

export function SearchBar({ id, initialQuery = "" }: SearchBarProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const [term, setTerm] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Product[]>([]);

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((body: unknown) => {
          const record = typeof body === "object" && body !== null ? body : {};
          const data = "data" in record ? record.data : null;
          setSuggestions(Array.isArray(data) ? data : []);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  return (
    <div className="relative">
      <form
        action="/search"
        method="get"
        role="search"
        className="flex w-full overflow-hidden rounded-md border border-black/10 bg-white focus-within:border-primary"
      >
        <label htmlFor={id} className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id={id}
          name="q"
          type="search"
          value={term}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="h-11 w-full min-w-0 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="h-11 shrink-0 bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-5"
        >
          {t("searchButton")}
        </button>
      </form>
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          aria-label={t("suggestions")}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-black/10 bg-card shadow-soft"
        >
          {suggestions.map((product) => (
            <li key={product.slug}>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-sm hover:bg-peach"
                onClick={() => {
                  setOpen(false);
                  router.push(`/product/${product.slug}`);
                }}
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
