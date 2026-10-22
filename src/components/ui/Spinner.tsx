import { cn } from "@/lib/utils/cn";

type SpinnerProps = {
  className?: string;
  /** Screen-reader text; omit when the surrounding element already
   * communicates the busy state (e.g. a button with aria-busy). */
  label?: string;
};

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span className={cn("inline-flex", className)} role={label ? "status" : undefined}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="size-[1.1em] animate-spin motion-reduce:animate-none"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="3"
        />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
