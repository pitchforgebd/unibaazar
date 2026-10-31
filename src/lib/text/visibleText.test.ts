import { describe, expect, it } from "vitest";
import { visibleText } from "@/lib/text/visibleText";

describe("visibleText", () => {
  it("drops tags and collapses whitespace", () => {
    expect(
      visibleText("<p>Ayan 52 Pages</p><p><strong>Intelligent</strong> Book</p>"),
    ).toBe("Ayan 52 Pages Intelligent Book");
  });

  it("decodes the entities the editor writes, without double-decoding", () => {
    expect(visibleText("<p>Toys &amp; Books&nbsp;&lt;3+&gt;</p>")).toBe(
      "Toys & Books <3+>",
    );
    expect(visibleText("&amp;lt;")).toBe("&lt;");
  });

  it("treats an empty editor as empty", () => {
    expect(visibleText("<p></p>")).toBe("");
  });
});
