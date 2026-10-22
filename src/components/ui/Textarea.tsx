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

export type TextareaProps = ComponentPropsWithRef<"textarea"> & FieldProps;

export function Textarea({
  id: idProp,
  label,
  hideLabel,
  hint,
  error,
  containerClassName,
  className,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
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
      <textarea
        {...props}
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={describedBy}
        className={cn(
          controlBase,
          controlBorder(Boolean(error)),
          "px-3 py-2.5",
          className,
        )}
      />
    </FieldShell>
  );
}
