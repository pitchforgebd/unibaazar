import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const base = cn(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-theme font-semibold",
  "transition-[transform,background-color,border-color,color] duration-fast ease-standard",
  "active:scale-97 motion-reduce:active:scale-100",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
  "aria-disabled:cursor-not-allowed aria-disabled:active:scale-100",
  focusRing,
);

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  outline: "border border-muted bg-transparent text-ink hover:border-ink hover:bg-ink/5",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  // Functional (not theme-preset) danger color, matching the codebase's
  // existing red-700 error convention; white on red-700 passes AA.
  destructive: "bg-red-700 text-white hover:bg-red-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "size-9",
  md: "size-11",
  lg: "size-12",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], iconOnly ? iconSizes[size] : sizes[size], className);
}
