"use client";

import { useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import {
  CountUp,
  Marquee,
  PressScale,
  Reveal,
  Shimmer,
  ShakeOnError,
  Stagger,
  StaggerItem,
  useFlyToCart,
} from "@/components/motion";
import { Button } from "@/components/ui/Button";

const CATEGORIES = ["Fashion", "Electronics", "Grocery", "Beauty", "Home", "Sports"];

// A plain colored square so the flight has something to render — this demo
// thumbnail has no real product image.
const PLACEHOLDER_THUMB =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#F95B09"/></svg>',
  );

export function MotionSection() {
  const [qty, setQty] = useState(1);
  const [cartBumps, setCartBumps] = useState(0);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLButtonElement>(null);
  const fly = useFlyToCart();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Scroll reveal &amp; stagger
        </h3>
        <Reveal className="mt-2">
          <div className="rounded-theme bg-card p-4 text-sm text-foreground shadow-soft">
            This card fades and slides in once scrolled into view.
          </div>
        </Reveal>
        <Stagger className="mt-3 grid grid-cols-3 gap-3" amount={0.1}>
          {CATEGORIES.slice(0, 3).map((name) => (
            <StaggerItem key={name}>
              <div className="rounded-theme bg-card p-3 text-center text-sm text-foreground shadow-soft">
                {name}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Category marquee
        </h3>
        <Marquee className="mt-2" aria-label="Browse categories" pauseOnHover>
          {CATEGORIES.map((name) => (
            <span
              key={name}
              className="rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground shadow-soft"
            >
              {name}
            </span>
          ))}
        </Marquee>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Fly to cart, press feedback, count-up
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <PressScale lift>
            <div
              ref={thumbRef}
              className="size-16 rounded-theme bg-primary-light"
              aria-hidden="true"
            />
          </PressScale>
          <Button
            onClick={() => {
              if (thumbRef.current && cartRef.current) {
                void fly(thumbRef.current, cartRef.current, PLACEHOLDER_THUMB).then(() =>
                  setCartBumps((count) => count + 1),
                );
              }
            }}
          >
            Add to cart
          </Button>
          <button
            ref={cartRef}
            type="button"
            aria-label="Cart"
            className="grid size-11 place-items-center rounded-full bg-ink text-page"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
          </button>
          <CountUp
            value={cartBumps}
            className="text-lg font-bold text-ink"
            format={(n) => `Cart: ${n}`}
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Quantity count-up, shake on error, shimmer
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQty((n) => Math.max(1, n - 1))}
            >
              −
            </Button>
            <CountUp value={qty} className="w-8 text-center text-ink" />
            <Button variant="outline" size="sm" onClick={() => setQty((n) => n + 1)}>
              +
            </Button>
          </div>
          <ShakeOnError trigger={shakeTrigger}>
            <Button variant="outline" onClick={() => setShakeTrigger((n) => n + 1)}>
              Trigger validation shake
            </Button>
          </ShakeOnError>
          <Shimmer className="h-10 w-32 rounded-theme" />
        </div>
      </div>
    </div>
  );
}
