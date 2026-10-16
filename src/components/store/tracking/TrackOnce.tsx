"use client";

import { useEffect, useRef } from "react";
import { track, type TrackName } from "@/lib/tracking/browser";

export function TrackOnce({
  name,
  payload,
}: {
  name: TrackName;
  payload?: Record<string, string | number>;
}) {
  const sent = useRef(false);
  const encoded = JSON.stringify(payload ?? {});
  useEffect(() => {
    if (sent.current) {
      return;
    }
    sent.current = true;
    track(name, payload);
  }, [name, encoded, payload]);
  return null;
}
