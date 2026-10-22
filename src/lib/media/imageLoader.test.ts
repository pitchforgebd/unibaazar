import { describe, expect, it } from "vitest";
import imageLoader from "@/lib/media/imageLoader";

describe("imageLoader", () => {
  it("rounds up to the nearest generated width and returns the WebP variant", () => {
    expect(imageLoader({ src: "/uploads/abc123.png", width: 500 })).toBe(
      "/uploads/abc123-800.webp",
    );
    expect(imageLoader({ src: "/uploads/abc123.png", width: 400 })).toBe(
      "/uploads/abc123-400.webp",
    );
  });

  it("caps at the largest generated width when the request exceeds it", () => {
    expect(imageLoader({ src: "/uploads/abc123.jpg", width: 3000 })).toBe(
      "/uploads/abc123-1600.webp",
    );
  });

  it("passes through URLs that aren't processed uploads unchanged", () => {
    expect(imageLoader({ src: "https://example.com/photo.jpg", width: 800 })).toBe(
      "https://example.com/photo.jpg",
    );
    expect(imageLoader({ src: "data:image/svg+xml,%3Csvg/%3E", width: 8 })).toBe(
      "data:image/svg+xml,%3Csvg/%3E",
    );
  });
});
