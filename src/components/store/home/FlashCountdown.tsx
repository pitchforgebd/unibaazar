"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

type FlashCountdownProps = {
  endsAt: string;
  /** `onDark` for the homepage's dark flash-deal band (an inverted surface). */
  tone?: "solid" | "onDark";
};

// page-on-ink is the tested inverted-surface pairing (tokenPairs.test.ts);
// white-on-ink isn't — Luxe's ink is a light cream.
const tones = {
  solid: "bg-ink text-page",
  onDark: "bg-page/10 text-page ring-1 ring-page/20",
};

function parts(
  diff: number,
  t: (key: string) => string,
): { label: string; value: string }[] {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return [
    { label: t("countdownDays"), value: String(days).padStart(2, "0") },
    { label: t("countdownHours"), value: String(hours).padStart(2, "0") },
    { label: t("countdownMinutes"), value: String(minutes).padStart(2, "0") },
    { label: t("countdownSeconds"), value: String(seconds).padStart(2, "0") },
  ];
}

export function FlashCountdown({ endsAt, tone = "solid" }: FlashCountdownProps) {
  const t = useTranslations("home");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const boxes = parts(
    now === null ? 0 : Math.max(0, new Date(endsAt).getTime() - now),
    t,
  );

  return (
    <div className="flex gap-2" role="timer" aria-label={t("flashSaleTimeLeft")}>
      {boxes.map((box) => (
        <div
          key={box.label}
          className={cn(
            "grid h-14 w-14 place-items-center rounded-theme py-1",
            tones[tone],
          )}
        >
          <span className="font-heading text-lg leading-none font-bold tabular-nums">
            {now === null ? "--" : box.value}
          </span>
          <span className="text-[10px] tracking-wide uppercase">{box.label}</span>
        </div>
      ))}
    </div>
  );
}
