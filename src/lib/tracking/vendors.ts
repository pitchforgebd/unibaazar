"use client";

// Browser base code for each platform. Every loader is safe to call twice:
// the stub is created once, and calling `init` is guarded by `started`.

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push?: unknown;
  disablePushState?: boolean;
};

type Ttq = unknown[] & {
  track: (
    name: string,
    payload?: Record<string, unknown>,
    options?: { event_id: string },
  ) => void;
  page: () => void;
  _i?: Record<string, unknown[]>;
  _t?: Record<string, number>;
  _o?: Record<string, unknown>;
};

type Queued = ((...args: unknown[]) => void) & { q?: unknown[][] };

type Pintrk = ((...args: unknown[]) => void) & { queue: unknown[][]; version: string };

type Snaptr = ((...args: unknown[]) => void) & {
  queue: unknown[][];
  handleRequest?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    ttq?: Ttq;
    TiktokAnalyticsObject?: string;
    pintrk?: Pintrk;
    snaptr?: Snaptr;
    clarity?: Queued;
    hj?: Queued;
    _hjSettings?: { hjid: number; hjsv: number };
  }
}

const started = new Set<string>();

function once(key: string, run: () => void): void {
  if (started.has(key)) {
    return;
  }
  started.add(key);
  run();
}

function addScript(id: string, src: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function loadMetaPixel(pixelId: string): void {
  once(`meta:${pixelId}`, () => {
    if (!window.fbq) {
      const fbq = function (...args: unknown[]) {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
          return;
        }
        fbq.queue.push(args);
      } as Fbq;
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.push = fbq;
      // The pixel otherwise fires its own PageView on every pushState, on top
      // of the one track("PageView") sends with a deduplicating event id.
      fbq.disablePushState = true;
      window.fbq = fbq;
      window._fbq = fbq;
    }
    addScript("ub-meta", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", pixelId);
  });
}

const tiktokMethods = [
  "page",
  "track",
  "identify",
  "instances",
  "debug",
  "on",
  "off",
  "once",
  "ready",
  "alias",
  "group",
  "enableCookie",
  "disableCookie",
];

export function loadTiktokPixel(pixelId: string): void {
  once(`tiktok:${pixelId}`, () => {
    window.TiktokAnalyticsObject = "ttq";
    const ttq = (window.ttq ?? []) as unknown as Ttq & Record<string, unknown>;
    window.ttq = ttq;
    ttq.methods = tiktokMethods;
    for (const method of tiktokMethods) {
      ttq[method] = (...args: unknown[]) => {
        ttq.push([method, ...args]);
      };
    }
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = ttq._i ?? {};
    ttq._t = ttq._t ?? {};
    ttq._o = ttq._o ?? {};
    ttq._i[pixelId] = [];
    (ttq._i[pixelId] as unknown as { _u: string })._u = src;
    ttq._t[pixelId] = Date.now();
    ttq._o[pixelId] = {};
    addScript("ub-tiktok", `${src}?sdkid=${pixelId}&lib=ttq`);
  });
}

export function loadPinterestTag(tagId: string): void {
  once(`pinterest:${tagId}`, () => {
    if (!window.pintrk) {
      const pintrk = function (...args: unknown[]) {
        pintrk.queue.push(args);
      } as Pintrk;
      pintrk.queue = [];
      pintrk.version = "3.0";
      window.pintrk = pintrk;
    }
    addScript("ub-pinterest", "https://s.pinimg.com/ct/core.js");
    window.pintrk("load", tagId);
  });
}

export function loadSnapPixel(pixelId: string): void {
  once(`snap:${pixelId}`, () => {
    if (!window.snaptr) {
      const snaptr = function (...args: unknown[]) {
        if (snaptr.handleRequest) {
          snaptr.handleRequest(...args);
          return;
        }
        snaptr.queue.push(args);
      } as Snaptr;
      snaptr.queue = [];
      window.snaptr = snaptr;
    }
    addScript("ub-snap", "https://sc-static.net/scevent.min.js");
    window.snaptr("init", pixelId, {});
  });
}

export function loadClarity(projectId: string): void {
  once(`clarity:${projectId}`, () => {
    if (!window.clarity) {
      const clarity: Queued = (...args: unknown[]) => {
        (clarity.q = clarity.q ?? []).push(args);
      };
      window.clarity = clarity;
    }
    addScript("ub-clarity", `https://www.clarity.ms/tag/${projectId}`);
  });
}

export function loadHotjar(siteId: string): void {
  once(`hotjar:${siteId}`, () => {
    if (!window.hj) {
      const hj: Queued = (...args: unknown[]) => {
        (hj.q = hj.q ?? []).push(args);
      };
      window.hj = hj;
    }
    window._hjSettings = { hjid: Number(siteId), hjsv: 6 };
    addScript("ub-hotjar", `https://static.hotjar.com/c/hotjar-${siteId}.js?sv=6`);
  });
}
