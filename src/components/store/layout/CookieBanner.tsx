"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { hasConsentDecision, saveConsent } from "@/lib/tracking/browser";

export function CookieBanner({ text }: { text?: string }) {
  const t = useTranslations("cookie");
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    setVisible(!hasConsentDecision());
  }, []);

  function choose(categories: { analytics: boolean; marketing: boolean }) {
    saveConsent(categories);
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-16 z-50 border-t border-black/10 bg-card p-4 shadow-soft md:bottom-0">
      <div className="mx-auto max-w-container">
        {customizing ? (
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="font-semibold text-foreground">{t("necessary")}</span>
                <br />
                <span className="text-muted">{t("necessaryDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold text-foreground">{t("analytics")}</span>
                <br />
                <span className="text-muted">{t("analyticsDesc")}</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="font-semibold text-foreground">{t("marketing")}</span>
                <br />
                <span className="text-muted">{t("marketingDesc")}</span>
              </span>
            </label>
            <div>
              <Button onClick={() => choose({ analytics, marketing })}>
                {t("savePreferences")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">{text || t("text")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-10 rounded-md px-3 text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                onClick={() => setCustomizing(true)}
              >
                {t("customize")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-black/10 px-4 text-sm font-semibold"
                onClick={() => choose({ analytics: false, marketing: false })}
              >
                {t("rejectAll")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark"
                onClick={() => choose({ analytics: true, marketing: true })}
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
