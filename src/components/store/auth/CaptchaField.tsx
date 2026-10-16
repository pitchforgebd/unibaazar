"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (
    node: HTMLElement,
    options: { sitekey: string; callback: (token: string) => void },
  ) => string;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function CaptchaField({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const node = useRef<HTMLDivElement>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !node.current) {
      return;
    }
    let widgetId = "";
    let cancelled = false;
    const render = () => {
      if (cancelled || !node.current || !window.turnstile) {
        return;
      }
      widgetId = window.turnstile.render(node.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
      });
    };
    if (window.turnstile) {
      render();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = render;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey]);

  if (!siteKey) {
    return null;
  }
  return <div ref={node} className="mt-4" />;
}
