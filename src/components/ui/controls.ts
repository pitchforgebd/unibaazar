export const fieldClass =
  "h-11 w-full rounded-md border border-black/10 bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary";

export function buttonClass(variant: "primary" | "ink" | "outline" = "primary"): string {
  const base =
    "inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-semibold transition-transform duration-150 ease-out active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-dark focus-visible:outline-ink",
    ink: "bg-ink text-white hover:bg-black/80 focus-visible:outline-primary",
    outline:
      "border border-black/10 bg-card text-ink hover:border-primary hover:text-primary",
  };
  return `${base} ${variants[variant]}`;
}
