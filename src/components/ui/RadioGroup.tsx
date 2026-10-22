"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";
import { choiceInputBase } from "./Checkbox";
import { FieldError, FieldHint } from "./Field";

type RadioGroupContextValue = {
  name: string;
  value: string | undefined;
  select: (value: string) => void;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export type RadioGroupProps = {
  label: ReactNode;
  hideLabel?: boolean;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  hint?: ReactNode;
  error?: ReactNode;
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Arrow-key navigation and the single-tab-stop behaviour come from the
 * browser: native radios sharing a `name` already implement the roving
 * selection the ARIA radio-group pattern describes, so we deliberately
 * don't re-implement it in JS.
 */
export function RadioGroup({
  label,
  hideLabel,
  name: nameProp,
  value: valueProp,
  defaultValue,
  onValueChange,
  hint,
  error,
  orientation = "vertical",
  disabled = false,
  required = false,
  className,
  children,
}: RadioGroupProps) {
  const baseId = useId();
  const name = nameProp ?? baseId;
  const labelId = `${baseId}-label`;
  const hintId = hint ? `${baseId}-hint` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  const select = (next: string) => {
    if (valueProp === undefined) {
      setUncontrolled(next);
    }
    onValueChange?.(next);
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={cn(hintId, errorId) || undefined}
      aria-invalid={error ? true : undefined}
      aria-required={required || undefined}
      aria-disabled={disabled || undefined}
      className={cn("flex flex-col gap-2", className)}
    >
      <span
        id={labelId}
        className={cn("text-sm font-medium text-foreground", hideLabel && "sr-only")}
      >
        {label}
      </span>
      <div
        className={cn(
          "flex gap-3",
          orientation === "vertical" ? "flex-col" : "flex-row flex-wrap gap-x-6",
        )}
      >
        <RadioGroupContext.Provider
          value={{ name, value, select, disabled, required, invalid: Boolean(error) }}
        >
          {children}
        </RadioGroupContext.Provider>
      </div>
      {hint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

export type RadioProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "name" | "checked" | "defaultChecked" | "onChange" | "value"
> & {
  value: string;
  label: ReactNode;
  description?: ReactNode;
};

export function Radio({
  id: idProp,
  value,
  label,
  description,
  disabled,
  className,
  ...props
}: RadioProps) {
  const group = useContext(RadioGroupContext);
  if (!group) {
    throw new Error("<Radio> must be rendered inside a <RadioGroup>.");
  }
  const generated = useId();
  const id = idProp ?? generated;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <span className="relative mt-0.5 inline-flex">
        <input
          {...props}
          id={id}
          type="radio"
          name={group.name}
          value={value}
          checked={group.value === value}
          onChange={() => group.select(value)}
          disabled={group.disabled || disabled}
          required={group.required}
          aria-describedby={cn(props["aria-describedby"], descriptionId) || undefined}
          className={cn(
            choiceInputBase,
            "rounded-full",
            group.invalid ? "border-red-600" : "border-muted",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto size-2.5 scale-0 rounded-full bg-primary transition-transform duration-fast ease-standard peer-checked:scale-100 motion-reduce:transition-none"
        />
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
  );
}
