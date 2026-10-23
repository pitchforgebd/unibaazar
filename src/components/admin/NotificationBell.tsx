"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

type Row = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Payload = {
  unread: number;
  sound: boolean;
  rows: Row[];
};

function playPing(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // browsers may block audio until a gesture
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Payload>({ unread: 0, sound: true, rows: [] });
  const prevUnread = useRef(0);
  const primed = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/admin/notifications", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const body: unknown = await response.json().catch(() => null);
    const payload =
      typeof body === "object" &&
      body &&
      "data" in body &&
      typeof body.data === "object" &&
      body.data
        ? (body.data as Payload)
        : null;
    if (!payload) {
      return;
    }
    if (primed.current && payload.sound && payload.unread > prevUnread.current) {
      playPing();
    }
    primed.current = true;
    prevUnread.current = payload.unread;
    setData(payload);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(timer);
  }, [load]);

  // Close on Escape or a click outside the trigger/panel — the dropdown had
  // neither before; both are standard disclosure-widget behavior.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onPointerDown(event: PointerEvent): void {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function markAll(): Promise<void> {
    await fetch("/api/v1/admin/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }

  return (
    <div className="relative" ref={panelRef}>
      <IconButton
        aria-label={data.unread ? `${data.unread} unread alerts` : "Alerts"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" className="size-5" />
        {data.unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-white"
          >
            {data.unread > 99 ? "99+" : data.unread}
          </span>
        ) : null}
      </IconButton>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-theme border border-muted bg-card shadow-soft">
          <div className="flex items-center justify-between border-b border-black/5 px-3 py-2">
            <p className="font-heading text-sm font-semibold text-ink">Alerts</p>
            <Button variant="ghost" size="sm" onClick={() => void markAll()}>
              Mark all read
            </Button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {data.rows.length === 0 ? (
              <li className="px-3 py-4 text-sm text-muted">No alerts yet.</li>
            ) : (
              data.rows.map((row) => (
                <li
                  key={row.id}
                  className={`border-b border-black/5 px-3 py-2 text-sm ${row.readAt ? "" : "bg-peach/40"}`}
                >
                  {row.href ? (
                    <Link
                      href={row.href}
                      className="block font-semibold text-ink hover:text-primary"
                      onClick={() => setOpen(false)}
                    >
                      {row.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-ink">{row.title}</p>
                  )}
                  <p className="text-xs text-muted">{row.body}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {new Date(row.createdAt).toLocaleString("en-GB", {
                      timeZone: "Asia/Dhaka",
                    })}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
