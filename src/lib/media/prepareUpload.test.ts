import { describe, expect, it } from "vitest";
import { scaledSize, shrinkOutputType } from "@/lib/media/prepareUpload";

describe("scaledSize", () => {
  it("leaves an image that already fits untouched", () => {
    expect(scaledSize(1200, 800, 2000)).toEqual({ width: 1200, height: 800 });
    expect(scaledSize(2000, 2000, 2000)).toEqual({ width: 2000, height: 2000 });
  });

  it("caps the longest side and keeps the aspect ratio, landscape or portrait", () => {
    expect(scaledSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(scaledSize(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 });
  });
});

describe("shrinkOutputType", () => {
  it("keeps JPEG photos as JPEG", () => {
    expect(shrinkOutputType("image/jpeg")).toBe("image/jpeg");
  });

  it("uses WebP for formats that can carry transparency", () => {
    expect(shrinkOutputType("image/png")).toBe("image/webp");
    expect(shrinkOutputType("image/webp")).toBe("image/webp");
  });
});
