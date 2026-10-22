"use client";

import type { ComponentPropsWithRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  controlBase,
  controlBorder,
  FieldShell,
  useFieldIds,
  type FieldProps,
} from "./Field";

export type SelectProps = ComponentPropsWithRef<"select"> & FieldProps;

export function Select({
  id: idProp,
  label,
  hideLabel,
  hint,
  error,
  containerClassName,
  className,
  required,
  children,
  ...props
}: SelectProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(
    idProp,
    Boolean(hint),
    Boolean(error),
    props["aria-describedby"],
  );

  return (
    <FieldShell
      id={id}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      hintId={hintId}
      errorId={errorId}
      required={required}
      className={containerClassName}
    >
      <div className="relative">
        <select
          {...props}
          id={id}
          required={required}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-describedby={describedBy}
          className={cn(
            controlBase,
            controlBorder(Boolean(error)),
            "h-11 cursor-pointer appearance-none ps-3 pe-10",
            className,
          )}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted"
        />
      </div>
    </FieldShell>
  );
}
