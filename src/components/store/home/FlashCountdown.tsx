"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type FlashCountdownProps = {
  endsAt: string;
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

export function FlashCountdown({ endsAt }: FlashCountdownProps) {
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
    <div className="flex gap-2" aria-label={t("flashSaleTimeLeft")}>
      {boxes.map((box) => (
        <div
          key={box.label}
          className="grid h-14 w-14 place-items-center rounded-md bg-ink text-white"
        >
          <span className="text-base font-semibold leading-none">
            {now === null ? "--" : box.value}
          </span>
          <span className="text-[10px] tracking-wide uppercase">{box.label}</span>
        </div>
      ))}
    </div>
  );
}
