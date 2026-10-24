"use client";

import { useEffect, useState } from "react";

const pollMs = 30_000;

export function LiveVisitors({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch("/api/v1/admin/analytics/live");
        if (!response.ok) {
          return;
        }
        const body = (await response.json()) as { data?: { count: number } };
        if (!cancelled && typeof body.data?.count === "number") {
          setCount(body.data.count);
        }
      } catch {
        // Transient network hiccup — the next poll will catch up.
      }
    }
    const interval = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex size-full rounded-full bg-success" />
      </span>
      <span className="text-3xl font-bold text-ink">{count}</span>
      <span className="text-sm text-muted">active now (last 5 min)</span>
    </div>
  );
}
