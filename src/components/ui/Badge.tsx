import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "default" | "primary" | "accent" | "success" | "outline";

// Text/background pairings are chosen to pass AA in *every* preset (see
// tokenPairs.test.ts) — e.g. accent uses text-card, not text-white,
// because Luxe's accent is a light gold that white text fails on.
const variants: Record<BadgeVariant, string> = {
  default: "bg-ink/10 text-ink",
  primary: "bg-peach text-ink",
  accent: "bg-accent text-card",
  success: "bg-success text-white",
  outline: "border border-muted text-foreground",
};

export type BadgeProps = ComponentPropsWithRef<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
    />
  );
}
