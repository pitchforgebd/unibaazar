"use client";

import { useEffect } from "react";

export function MissBeacon() {
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/api") || path.includes(".")) {
      return;
    }
    void fetch("/api/v1/seo/miss", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);
  return null;
}
