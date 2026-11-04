"use client";

import { useEffect, useRef } from "react";
import { track, type TrackName } from "@/lib/tracking/browser";
import type { TrackData } from "@/lib/tracking/ecommerce";

/** Fires once per distinct event: a new search on the same page still counts. */
export function TrackOnce({ name, data }: { name: TrackName; data?: TrackData }) {
  const sent = useRef<string | null>(null);
  const encoded = `${name}:${JSON.stringify(data ?? {})}`;
  useEffect(() => {
    if (sent.current === encoded) {
      return;
    }
    sent.current = encoded;
    track(name, data);
  }, [name, encoded, data]);
  return null;
}
