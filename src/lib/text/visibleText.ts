const entities: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&amp;": "&",
};

/**
 * The plain text inside rich-text HTML, for places that can't render markup:
 * meta descriptions, JSON-LD, social posts, and "is this field empty?" checks.
 */
export function visibleText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(nbsp|lt|gt|quot|#39|amp);/g, (entity) => entities[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}
