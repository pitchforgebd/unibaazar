"use client";

import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils/cn";
import {
  controlBase,
  controlBorder,
  FieldShell,
  useFieldIds,
  type FieldProps,
} from "./Field";

export type InputProps = ComponentPropsWithRef<"input"> & FieldProps;

export function Input({
  id: idProp,
  label,
  hideLabel,
  hint,
  error,
  containerClassName,
  className,
  required,
  ...props
}: InputProps) {
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
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={cn(controlBase, controlBorder(Boolean(error)), "h-11 px-3", className)}
      />
    </FieldShell>
  );
}
