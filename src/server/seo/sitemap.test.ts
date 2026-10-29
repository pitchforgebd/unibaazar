import { describe, expect, it } from "vitest";
import { buildSitemapIndexXml, buildUrlsetXml, buildVideoSitemapXml } from "./sitemap";

const origin = "https://unibaazar.com";

describe("buildUrlsetXml", () => {
  it("emits both locale variants of each path, en bare and bn prefixed", () => {
    const xml = buildUrlsetXml([{ path: "/shop" }], origin);
    expect(xml).toContain("<loc>https://unibaazar.com/shop</loc>");
    expect(xml).toContain("<loc>https://unibaazar.com/bn/shop</loc>");
  });

  it("includes lastmod only when given", () => {
    const withDate = buildUrlsetXml(
      [{ path: "/shop", lastmod: new Date("2026-01-01T00:00:00.000Z") }],
      origin,
    );
    expect(withDate).toContain("<lastmod>2026-01-01T00:00:00.000Z</lastmod>");
    const withoutDate = buildUrlsetXml([{ path: "/shop" }], origin);
    expect(withoutDate).not.toContain("<lastmod>");
  });

  it("escapes special characters in the built URL", () => {
    const xml = buildUrlsetXml([{ path: "/search?q=a&b" }], origin);
    expect(xml).toContain("&amp;b");
    expect(xml).not.toContain("q=a&b<");
  });

  it("produces a well-formed urlset root with no sitemap-index markers", () => {
    const xml = buildUrlsetXml([{ path: "/" }], origin);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).not.toContain("<sitemapindex");
  });
});

describe("buildSitemapIndexXml", () => {
  it("lists one <sitemap> entry per child path, as an absolute URL", () => {
    const xml = buildSitemapIndexXml(
      ["/sitemaps/products.xml", "/sitemaps/blog.xml"],
      origin,
    );
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("<loc>https://unibaazar.com/sitemaps/products.xml</loc>");
    expect(xml).toContain("<loc>https://unibaazar.com/sitemaps/blog.xml</loc>");
  });
});

describe("buildVideoSitemapXml", () => {
  it("groups multiple videos on the same page under one <url>", () => {
    const xml = buildVideoSitemapXml(
      [
        { path: "/videos", title: "Clip 1", youtubeUrl: "https://youtu.be/dQw4w9WgXcQ" },
        { path: "/videos", title: "Clip 2", youtubeUrl: "https://youtu.be/aaaaaaaaaaa" },
      ],
      origin,
    );
    expect(xml.match(/<url>/g)).toHaveLength(1);
    expect(xml.match(/<video:video>/g)).toHaveLength(2);
    expect(xml).toContain("xmlns:video=");
  });

  it("silently drops a video whose URL carries no extractable id", () => {
    const xml = buildVideoSitemapXml(
      [{ path: "/videos", title: "Broken", youtubeUrl: "not-a-url" }],
      origin,
    );
    expect(xml).not.toContain("<video:video>");
  });

  it("includes publication_date only when an upload date is given", () => {
    const xml = buildVideoSitemapXml(
      [
        {
          path: "/product/tee",
          title: "Tee demo",
          youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
          uploadDate: new Date("2026-02-01T00:00:00.000Z"),
        },
      ],
      origin,
    );
    expect(xml).toContain("<video:publication_date>2026-02-01T00:00:00.000Z");
  });
});
