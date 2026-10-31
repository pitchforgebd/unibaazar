import { cn } from "@/lib/utils/cn";

/**
 * Renders admin rich-text (Tiptap) HTML. `safeHtml` must already have been
 * through sanitizeRichText — the product loader does that once, server-side.
 */
export function RichText({
  safeHtml,
  className,
}: {
  safeHtml: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-black/10 [&_blockquote]:pl-3 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_img]:max-w-full [&_img]:rounded-md [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
