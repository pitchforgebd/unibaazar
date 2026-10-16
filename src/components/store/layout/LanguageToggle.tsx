"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import type { Locale } from "@/i18n/config";

const options: { locale: Locale; label: string }[] = [
  { locale: "en", label: "EN" },
  { locale: "bn", label: "বাংলা" },
];

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("common");

  async function choose(next: Locale) {
    if (next === locale) {
      return;
    }
    await setLocale(next);
    router.refresh();
  }

  return (
    <div className="flex items-center" role="group" aria-label={t("language")}>
      {options.map((option, index) => (
        <span key={option.locale} className="flex items-center">
          {index > 0 ? (
            <span aria-hidden="true" className="px-2 text-white/50">
              |
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={locale === option.locale}
            onClick={() => void choose(option.locale)}
            className={`whitespace-nowrap hover:underline ${
              locale === option.locale ? "font-semibold" : "text-white/80"
            }`}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}
