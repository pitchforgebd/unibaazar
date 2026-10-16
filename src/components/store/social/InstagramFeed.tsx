"use client";

import { useEffect } from "react";

export function InstagramFeed({ urls }: { urls: string[] }) {
  useEffect(() => {
    if (urls.length === 0) {
      return;
    }
    const existing = document.getElementById("ub-instagram-embed");
    if (existing) {
      const win = window as Window & { instgrm?: { Embeds: { process: () => void } } };
      win.instgrm?.Embeds.process();
      return;
    }
    const script = document.createElement("script");
    script.id = "ub-instagram-embed";
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    document.body.appendChild(script);
  }, [urls]);

  if (urls.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {urls.map((url) => (
        <blockquote
          key={url}
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{ margin: 0, width: "100%" }}
        />
      ))}
    </div>
  );
}
