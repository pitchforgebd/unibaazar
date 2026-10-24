"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  ensureFbq,
  hasConsentFor,
  hasTrackingConsent,
  setAdsConversionTarget,
  track,
} from "@/lib/tracking/browser";
import { readUtm } from "@/lib/tracking/utm";
import { ensureVisitorId } from "@/lib/tracking/visitor";
import type { TrackingSettings } from "@/server/tracking/config";

function addScript(id: string, src: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

/** Google Consent Mode v2 signal — read by any Google tag (GA4, Ads,
 * and GTM-managed tags) once loaded, independent of whether this app's
 * own script-loading gate (below) already kept them from loading at
 * all pre-consent. Called both when a Google script first boots and
 * again on every later consent change, per Google's own "default then
 * update" pattern. */
function pushConsentSignal(analytics: boolean, marketing: boolean): void {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

export function StorePixels({ config }: { config: TrackingSettings }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [analyticsReady, setAnalyticsReady] = useState(false);
  const [marketingReady, setMarketingReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setReady(hasTrackingConsent());
      setAnalyticsReady(hasConsentFor("analytics"));
      setMarketingReady(hasConsentFor("marketing"));
      pushConsentSignal(hasConsentFor("analytics"), hasConsentFor("marketing"));
    };
    sync();
    window.addEventListener("unibaazar:consent", sync);
    return () => window.removeEventListener("unibaazar:consent", sync);
  }, []);

  useEffect(() => {
    if (marketingReady && config.metaPixelId) {
      ensureFbq();
      addScript("ub-meta", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq?.("init", config.metaPixelId);
    }
    if (marketingReady && config.tiktokPixelId) {
      addScript("ub-tiktok", "https://analytics.tiktok.com/i18n/pixel/events.js");
    }
    if (marketingReady && config.pinterestId) {
      addScript("ub-pinterest", "https://s.pinimg.com/ct/core.js");
    }
    if (marketingReady && config.snapId) {
      addScript("ub-snap", "https://sc-static.net/scevent.min.js");
    }
  }, [marketingReady, config]);

  useEffect(() => {
    if (!analyticsReady) {
      return;
    }
    if (config.gtmId) {
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      addScript("ub-gtm", `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`);
    }
    if (config.ga4Id) {
      addScript("ub-ga4", `https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`);
      window.dataLayer = window.dataLayer ?? [];
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag("consent", "default", {
        analytics_storage: "granted",
        ad_storage: marketingReady ? "granted" : "denied",
        ad_user_data: marketingReady ? "granted" : "denied",
        ad_personalization: marketingReady ? "granted" : "denied",
      });
      window.gtag("js", new Date());
      window.gtag("config", config.ga4Id);
      if (config.adsId) {
        window.gtag("config", config.adsId);
      }
    }
    if (config.adsId && config.adsLabel) {
      setAdsConversionTarget(config.adsId, config.adsLabel);
    }
    if (config.clarityId) {
      addScript("ub-clarity", `https://www.clarity.ms/tag/${config.clarityId}`);
    }
    if (config.hotjarId) {
      addScript(
        "ub-hotjar",
        `https://static.hotjar.com/c/hotjar-${config.hotjarId}.js?sv=6`,
      );
    }
  }, [analyticsReady, marketingReady, config]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    // readUtm() is the persisted last-touch set (lib/tracking/utm.ts),
    // not just whatever's literally in this page's own URL — a visitor
    // who landed on a ?utm_source=... page and clicked elsewhere on the
    // site would otherwise only have their very first PageView
    // attributable, undercounting every page after it.
    track("PageView", { path: pathname, ...readUtm(), visitorId: ensureVisitorId() });
  }, [ready, pathname]);

  return null;
}
