"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const storageKey = "unibaazar:cookie";

export function CookieBanner({ text }: { text?: string }) {
  const t = useTranslations("cookie");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(storageKey) === null);
  }, []);

  function choose(value: "accept" | "reject") {
    window.localStorage.setItem(storageKey, value);
    window.dispatchEvent(new Event("unibaazar:consent"));
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 border-t border-black/10 bg-card p-4 shadow-soft md:bottom-0">
      <div className="mx-auto flex max-w-container flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">{text || t("text")}</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="h-10 rounded-md border border-black/10 px-4 text-sm font-semibold"
            onClick={() => choose("reject")}
          >
            {t("reject")}
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
            onClick={() => choose("accept")}
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
