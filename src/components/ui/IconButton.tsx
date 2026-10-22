"use client";

import type { ComponentPropsWithRef } from "react";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./buttonStyles";

export type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "aria-label"> & {
  /** Required: an icon-only button has no other accessible name. */
  "aria-label": string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function IconButton({
  variant = "ghost",
  size,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={buttonStyles({ variant, size, iconOnly: true, className })}
    />
  );
}
