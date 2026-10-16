"use client";

import { useEffect, useState } from "react";

type FlashCountdownProps = {
  endsAt: string;
};

function parts(diff: number): { label: string; value: string }[] {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Min", value: String(minutes).padStart(2, "0") },
    { label: "Sec", value: String(seconds).padStart(2, "0") },
  ];
}

export function FlashCountdown({ endsAt }: FlashCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const boxes = parts(now === null ? 0 : Math.max(0, new Date(endsAt).getTime() - now));

  return (
    <div className="flex gap-2" aria-label="Time left in the flash sale">
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
