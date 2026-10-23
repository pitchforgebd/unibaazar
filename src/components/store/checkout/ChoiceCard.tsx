import type { ReactNode } from "react";
import { choiceInputBase } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils/cn";

/** Class for the native radio passed as `control` — matches components/ui's Radio. */
export const choiceRadioClass = cn(choiceInputBase, "rounded-full border-muted");

type ChoiceCardProps = {
  /** The native `<input type="radio">`, rendered by the caller so its
   * react-hook-form `register(...)` wiring stays where the form lives. */
  control: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  trailing?: ReactNode;
};

/**
 * A selectable card around a native radio. Purely presentational: the
 * checked state lives on the input itself, and the card reads it through
 * `:has(:checked)`, so nothing here can drift from the form's value.
 */
export function ChoiceCard({
  control,
  title,
  description,
  icon,
  trailing,
}: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-theme border border-ink/15 bg-card p-3",
        "transition-colors duration-fast ease-standard motion-reduce:transition-none",
        "hover:border-ink/40",
        "has-[:checked]:border-primary has-[:checked]:bg-peach/40",
      )}
    >
      <span className="relative inline-flex">
        {control}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto size-2.5 scale-0 rounded-full bg-primary transition-transform duration-fast ease-standard peer-checked:scale-100 motion-reduce:transition-none"
        />
      </span>
      {icon ? (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-theme bg-page text-primary"
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink">{title}</span>
        {description ? <span className="text-xs text-muted">{description}</span> : null}
      </span>
      {trailing ? (
        <span className="shrink-0 text-sm font-semibold text-ink">{trailing}</span>
      ) : null}
    </label>
  );
}
