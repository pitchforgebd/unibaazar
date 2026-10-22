"use client";

import type { ComponentPropsWithRef, MouseEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./buttonStyles";
import { Spinner } from "./Spinner";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /** Announced to screen readers while loading. */
  loadingLabel?: string;
};

export function Button({
  variant,
  size,
  isLoading = false,
  loadingLabel,
  className,
  children,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  // While loading we use aria-disabled instead of the native `disabled`
  // attribute: disabling a focused button drops focus to <body>, which
  // would strand keyboard users (e.g. inside an AlertDialog mid-confirm).
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (isLoading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      {...props}
      onClick={handleClick}
      aria-busy={isLoading || undefined}
      aria-disabled={isLoading || props["aria-disabled"] || undefined}
      className={buttonStyles({ variant, size, className })}
    >
      <span className={cn("inline-flex items-center gap-2", isLoading && "invisible")}>
        {children}
      </span>
      {isLoading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner label={loadingLabel} />
        </span>
      ) : null}
    </button>
  );
}
