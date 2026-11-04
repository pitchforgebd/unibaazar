import { Parser, parseDocument } from "htmlparser2";

export type HeadTag = {
  tag: "meta" | "link" | "script" | "style" | "noscript";
  attrs: Record<string, string>;
  inner: string;
};

const headTags: readonly string[] = ["meta", "link", "script", "style", "noscript"];
const pageTags: readonly string[] = ["html", "head", "body", "title", "base"];
const voidTags: readonly string[] = [
  "area",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
];
// HTML lets these close themselves; a missing end tag on anything else would
// swallow the rest of the page.
const selfClosing: readonly string[] = ["p", "li", "tr", "td", "th", "option"];

function assertWellFormed(source: string): void {
  if (source.split("<!--").length !== source.split("-->").length) {
    throw new Error("A <!-- comment --> in the snippet is never closed");
  }
  let unclosed: string | null = null;
  const parser = new Parser({
    onopentagname(name) {
      if (pageTags.includes(name)) {
        throw new Error(`Remove the <${name}> tag — the site already has one`);
      }
    },
    onclosetag(name, implied) {
      if (implied && !voidTags.includes(name) && !selfClosing.includes(name)) {
        unclosed = name;
      }
    },
  });
  parser.write(source);
  parser.end();
  if (unclosed) {
    throw new Error(`The <${unclosed}> tag in the snippet is never closed`);
  }
}

/** Parses the head snippet into tags React can render, rejecting anything unsafe to place in <head>. */
export function parseHeadSnippet(source: string): HeadTag[] {
  if (!source.trim()) {
    return [];
  }
  assertWellFormed(source);
  const document = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const tags: HeadTag[] = [];
  for (const node of document.children) {
    if (node.type === "text") {
      if ("data" in node && node.data.trim()) {
        throw new Error(
          `Text can't go in the head: "${node.data.trim().slice(0, 30)}". Only meta, link, script, style and noscript tags are allowed.`,
        );
      }
      continue;
    }
    if (!("attribs" in node)) {
      continue;
    }
    if (!headTags.includes(node.name)) {
      throw new Error(
        `<${node.name}> can't go in the head. Only meta, link, script, style and noscript tags are allowed — use the body box for anything else.`,
      );
    }
    const handler = Object.keys(node.attribs).find((name) => name.startsWith("on"));
    if (handler) {
      throw new Error(`Remove the ${handler} attribute from <${node.name}>`);
    }
    const first = node.children[0];
    const last = node.children[node.children.length - 1];
    tags.push({
      tag: node.name as HeadTag["tag"],
      attrs: node.attribs,
      inner:
        first && last
          ? source.slice(first.startIndex ?? 0, (last.endIndex ?? -1) + 1)
          : "",
    });
  }
  return tags;
}

export function assertBodySnippet(source: string): void {
  if (source.trim()) {
    assertWellFormed(source);
  }
}

const reactNames: Record<string, string> = {
  class: "className",
  charset: "charSet",
  crossorigin: "crossOrigin",
  fetchpriority: "fetchPriority",
  hreflang: "hrefLang",
  "http-equiv": "httpEquiv",
  imagesizes: "imageSizes",
  imagesrcset: "imageSrcSet",
  nomodule: "noModule",
  referrerpolicy: "referrerPolicy",
};
const booleanAttrs: readonly string[] = ["async", "defer", "nomodule"];

/** HTML attributes → the prop names React expects. */
export function reactProps(
  attrs: Record<string, string>,
): Record<string, string | boolean> {
  return Object.fromEntries(
    Object.entries(attrs).map(([name, value]) => [
      reactNames[name] ?? name,
      booleanAttrs.includes(name) ? true : value,
    ]),
  );
}
