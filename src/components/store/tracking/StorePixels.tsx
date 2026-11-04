"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { flushTracking, readConsent, track } from "@/lib/tracking/browser";
import {
  loadClarity,
  loadHotjar,
  loadMetaPixel,
  loadPinterestTag,
  loadSnapPixel,
  loadTiktokPixel,
} from "@/lib/tracking/vendors";
import type { TrackingSettings } from "@/server/tracking/config";

/** Tells Google tags the shopper's choice. Defaults are set in the head snippet. */
function pushConsentSignal(analytics: boolean, marketing: boolean): void {
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

export function StorePixels({ config }: { config: TrackingSettings }) {
  const pathname = usePathname();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const sync = () => {
      const consent = readConsent();
      setAnalytics(consent?.analytics === true);
      setMarketing(consent?.marketing === true);
      setChecked(true);
      if (consent) {
        pushConsentSignal(consent.analytics, consent.marketing);
      }
    };
    sync();
    window.addEventListener("unibaazar:consent", sync);
    return () => window.removeEventListener("unibaazar:consent", sync);
  }, []);

  useEffect(() => {
    if (!checked) {
      return;
    }
    if (marketing) {
      if (config.metaPixelId) {
        loadMetaPixel(config.metaPixelId);
      }
      if (config.tiktokPixelId) {
        loadTiktokPixel(config.tiktokPixelId);
      }
      if (config.pinterestId) {
        loadPinterestTag(config.pinterestId);
      }
      if (config.snapId) {
        loadSnapPixel(config.snapId);
      }
    }
    if (analytics) {
      if (config.clarityId) {
        loadClarity(config.clarityId);
      }
      if (config.hotjarId) {
        loadHotjar(config.hotjarId);
      }
    }
    // After the pixels exist: anything raised while they were starting goes out now.
    flushTracking();
  }, [checked, analytics, marketing, config]);

  useEffect(() => {
    track("PageView", {
      path: pathname,
      title: document.title,
      url: window.location.href,
    });
  }, [pathname]);

  return null;
}
