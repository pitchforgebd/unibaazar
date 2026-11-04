"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { captureClickIds } from "@/lib/tracking/fbclid";
import { captureUtm } from "@/lib/tracking/utm";

export function UtmCapture() {
  const pathname = usePathname();

  useEffect(() => {
    captureUtm();
    captureClickIds();
  }, [pathname]);

  return null;
}
