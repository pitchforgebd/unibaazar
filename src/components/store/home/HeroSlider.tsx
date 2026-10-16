"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
  imageHue: number | null;
};

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const slide = slides[Math.min(index, slides.length - 1)];
  const hue = slide.imageHue ?? 24;

  return (
    <div
      className="relative min-h-56 overflow-hidden rounded-lg p-6 text-white sm:min-h-80 sm:p-10"
      style={
        slide.imageUrl
          ? {
              backgroundImage: `url(${slide.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundColor: `hsl(${hue} 72% 42%)` }
      }
    >
      {slide.imageUrl ? <div className="absolute inset-0 bg-black/35" /> : null}
      <div className="relative">
        <p className="text-sm font-semibold tracking-wide uppercase">UniBaazar</p>
        <h2 className="mt-3 max-w-lg text-3xl font-bold sm:text-4xl">{slide.title}</h2>
        {slide.subtitle ? (
          <p className="mt-3 max-w-md text-sm text-white/90 sm:text-base">
            {slide.subtitle}
          </p>
        ) : null}
        <Link
          href={slide.href}
          className="mt-6 inline-flex h-11 items-center rounded-md bg-white px-4 text-sm font-semibold text-ink"
        >
          Shop now
        </Link>
        <div className="mt-6 flex gap-2">
          {slides.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show slide ${itemIndex + 1}`}
              aria-pressed={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
              className={`h-2.5 w-2.5 rounded-full ${itemIndex === index ? "bg-white" : "bg-white/40"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
