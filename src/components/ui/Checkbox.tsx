"use client";

import {
  useEffect,
  useId,
  useRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { FieldError } from "./Field";
import { mergeRefs } from "./mergeRefs";

export type CheckboxProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  indeterminate?: boolean;
};

export const choiceInputBase = cn(
  "peer size-5 shrink-0 cursor-pointer appearance-none border-2 bg-card",
  "transition-colors duration-fast ease-standard",
  "checked:border-primary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function Checkbox({
  id: idProp,
  label,
  description,
  error,
  indeterminate = false,
  className,
  ref,
  ...props
}: CheckboxProps) {
  const generated = useId();
  const id = idProp ?? generated;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const inputRef = useRef<HTMLInputElement>(null);

  // `indeterminate` is a DOM property only — there is no HTML attribute for it.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 inline-flex">
          <input
            {...props}
            ref={mergeRefs(inputRef, ref)}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              cn(props["aria-describedby"], descriptionId, errorId) || undefined
            }
            className={cn(
              choiceInputBase,
              "rounded-sm checked:bg-primary indeterminate:border-primary indeterminate:bg-primary",
              error ? "border-red-600" : "border-muted",
            )}
          />
          {indeterminate ? (
            <Minus
              aria-hidden="true"
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white"
            />
          ) : (
            <Check
              aria-hidden="true"
              strokeWidth={3}
              className="pointer-events-none absolute inset-0 m-auto size-3.5 text-white opacity-0 peer-checked:opacity-100"
            />
          )}
        </span>
        <span className="flex flex-col gap-0.5">
          <label htmlFor={id} className="cursor-pointer text-sm text-foreground">
            {label}
          </label>
          {description ? (
            <span id={descriptionId} className="text-xs text-muted">
              {description}
            </span>
          ) : null}
        </span>
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
