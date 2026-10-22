import { useId, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type FieldProps = {
  label: ReactNode;
  /** Keeps the label for screen readers but hides it visually. */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  containerClassName?: string;
};

export const controlBase = cn(
  "w-full rounded-theme border bg-card text-sm text-foreground placeholder:text-muted",
  "transition-colors duration-fast ease-standard",
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

// red-600 rather than a theme token: no single red reaches 4.5:1 text
// contrast on both a white card and Luxe's near-black card, but red-600
// clears the 3:1 non-text minimum (borders, icons) on both — so the error
// *message* stays text-foreground and only the border/icon carry red.
export const controlBorder = (invalid: boolean) =>
  invalid ? "border-red-600 focus-visible:outline-red-600" : "border-muted";

export function useFieldIds(
  idProp: string | undefined,
  hasHint: boolean,
  hasError: boolean,
  extraDescribedBy?: string,
) {
  const generated = useId();
  const id = idProp ?? generated;
  const hintId = hasHint ? `${id}-hint` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const describedBy = cn(extraDescribedBy, hintId, errorId) || undefined;
  return { id, hintId, errorId, describedBy };
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-foreground">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600" />
      <span>{children}</span>
    </p>
  );
}

type FieldShellProps = Omit<FieldProps, "containerClassName"> & {
  id: string;
  hintId?: string;
  errorId?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function FieldShell({
  id,
  label,
  hideLabel,
  hint,
  error,
  hintId,
  errorId,
  required,
  className,
  children,
}: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ms-0.5 text-muted">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
