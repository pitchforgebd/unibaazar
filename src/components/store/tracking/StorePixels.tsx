"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureFbq, hasTrackingConsent, track } from "@/lib/tracking/browser";
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

export function StorePixels({ config }: { config: TrackingSettings }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setReady(hasTrackingConsent());
    sync();
    window.addEventListener("unibaazar:consent", sync);
    return () => window.removeEventListener("unibaazar:consent", sync);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (config.metaPixelId) {
      ensureFbq();
      addScript("ub-meta", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq?.("init", config.metaPixelId);
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
      window.gtag("js", new Date());
      window.gtag("config", config.ga4Id);
      if (config.adsId) {
        window.gtag("config", config.adsId);
      }
    }
    if (config.tiktokPixelId) {
      addScript("ub-tiktok", "https://analytics.tiktok.com/i18n/pixel/events.js");
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
    if (config.pinterestId) {
      addScript("ub-pinterest", "https://s.pinimg.com/ct/core.js");
    }
    if (config.snapId) {
      addScript("ub-snap", "https://sc-static.net/scevent.min.js");
    }
  }, [ready, config]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign"] as const) {
      const value = params.get(key)?.trim().slice(0, 80);
      if (value) {
        utm[key] = value;
      }
    }
    track("PageView", { path: pathname, ...utm });
  }, [ready, pathname]);

  return null;
}
