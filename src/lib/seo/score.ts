export function seoHints(input: {
  title: string;
  description: string;
  h1: string;
  focusKeyword?: string;
  alts?: string[];
}): string[] {
  const hints: string[] = [];
  const title = input.title.trim();
  const description = input.description.trim();
  const keyword = input.focusKeyword?.trim() ?? "";
  if (!title) {
    hints.push("Add a meta title. Aim for 50–60 characters.");
  } else if (title.length < 50 || title.length > 60) {
    hints.push(`Meta title is ${title.length} characters. Aim for 50–60.`);
  } else {
    hints.push(`Meta title length looks good (${title.length}).`);
  }
  if (keyword && title && !title.toLowerCase().includes(keyword.toLowerCase())) {
    hints.push("Use the focus keyword in the meta title.");
  }
  if (!description) {
    hints.push("Add a meta description. Aim for 120–160 characters.");
  } else if (description.length < 120 || description.length > 160) {
    hints.push(`Meta description is ${description.length} characters. Aim for 120–160.`);
  } else {
    hints.push(`Meta description length looks good (${description.length}).`);
  }
  if (!input.h1.trim()) {
    hints.push("Add one H1. The page title is the H1.");
  } else {
    hints.push("One H1 comes from the page title.");
  }
  if (input.alts) {
    const missing = input.alts.filter((alt) => alt.trim() === "").length;
    if (input.alts.length === 0) {
      hints.push("Add an image. A blank alt uses the product name on save.");
    } else if (missing > 0) {
      hints.push(
        missing === 1
          ? "1 image will use the product name as alt text."
          : `${missing} images will use the product name as alt text.`,
      );
    } else {
      hints.push("Every image has alt text.");
    }
  }
  return hints;
}
