import { describe, expect, it } from "vitest";
import {
  assertBodySnippet,
  parseHeadSnippet,
  reactProps,
} from "@/server/tracking/snippets";

describe("parseHeadSnippet", () => {
  it("returns nothing for an empty box", () => {
    expect(parseHeadSnippet("  \n ")).toEqual([]);
  });

  it("parses meta verification tags, keeping them as real tags", () => {
    expect(
      parseHeadSnippet(`<meta name="facebook-domain-verification" content="abc123" />`),
    ).toEqual([
      {
        tag: "meta",
        attrs: { name: "facebook-domain-verification", content: "abc123" },
        inner: "",
      },
    ]);
  });

  it("handles a typical Google snippet: external script plus inline code", () => {
    const tags = parseHeadSnippet(`<!-- Tag -->
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-X"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>`);
    expect(tags).toHaveLength(2);
    expect(tags[0].attrs.src).toContain("gtm.js");
    expect(tags[1].inner).toContain("gtag('js', new Date());");
  });

  it("keeps script bodies untouched, including < and quotes", () => {
    const [tag] = parseHeadSnippet(`<script>if (a < b && c > "d") run();</script>`);
    expect(tag.inner).toBe(`if (a < b && c > "d") run();`);
  });

  it("keeps a noscript body as raw html", () => {
    const [tag] = parseHeadSnippet(
      `<noscript><img src="https://x.test/p.gif"/></noscript>`,
    );
    expect(tag.tag).toBe("noscript");
    expect(tag.inner).toContain("<img");
  });

  it("refuses tags that would break out of the head", () => {
    expect(() => parseHeadSnippet("<div>hi</div>")).toThrow("can't go in the head");
    expect(() => parseHeadSnippet("plain text")).toThrow("Text can't go in the head");
  });

  it("refuses an unclosed script, which would swallow the whole page", () => {
    expect(() => parseHeadSnippet("<script>var a = 1;")).toThrow("never closed");
  });

  it("refuses an unclosed comment", () => {
    expect(() => parseHeadSnippet("<!-- oops <meta name='a' />")).toThrow("never closed");
  });

  it("refuses document-level tags the site already has", () => {
    expect(() => parseHeadSnippet("<title>Hi</title>")).toThrow("already has one");
  });

  it("refuses inline event handlers, which React can't render", () => {
    expect(() =>
      parseHeadSnippet(`<script src="https://x.test/a.js" onload="go()"></script>`),
    ).toThrow("onload");
  });
});

describe("assertBodySnippet", () => {
  it("accepts ordinary body code, including a GTM noscript", () => {
    expect(() =>
      assertBodySnippet(
        `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X"></iframe></noscript><div id="fb-root"></div><p>one<p>two`,
      ),
    ).not.toThrow();
  });

  it("refuses an unclosed tag", () => {
    expect(() => assertBodySnippet("<div><span>hi</span>")).toThrow("<div>");
  });

  it("refuses a second body tag", () => {
    expect(() => assertBodySnippet("<body>hi</body>")).toThrow("already has one");
  });
});

describe("reactProps", () => {
  it("maps html attribute names to React's and marks boolean attributes", () => {
    expect(
      reactProps({
        async: "",
        crossorigin: "anonymous",
        "http-equiv": "refresh",
        "data-site": "1",
      }),
    ).toEqual({
      async: true,
      crossOrigin: "anonymous",
      httpEquiv: "refresh",
      "data-site": "1",
    });
  });
});
