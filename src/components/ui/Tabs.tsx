"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { nextRovingIndex } from "./roving";

export type TabItem = {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

export type TabsProps = {
  items: TabItem[];
  /** Accessible name for the tab list — pass a translated string. */
  label: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** "automatic" selects on arrow-key focus; "manual" waits for Enter/Space
   * (use manual when a panel is expensive to render). */
  activation?: "automatic" | "manual";
  className?: string;
  listClassName?: string;
  panelClassName?: string;
};

export function Tabs({
  items,
  label,
  value: valueProp,
  defaultValue,
  onValueChange,
  activation = "automatic",
  className,
  listClassName,
  panelClassName,
}: TabsProps) {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const firstEnabled = items.find((item) => !item.disabled)?.value;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? firstEnabled);
  const requested = valueProp ?? uncontrolled;
  const selected = items.some((item) => item.value === requested && !item.disabled)
    ? requested
    : firstEnabled;

  const select = (next: string) => {
    if (valueProp === undefined) {
      setUncontrolled(next);
    }
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = tabRefs.current.findIndex((tab) => tab === document.activeElement);
    if (current === -1) {
      return;
    }
    const next = nextRovingIndex(
      current,
      event.key,
      items.map((item) => Boolean(item.disabled)),
    );
    if (next === null) {
      return;
    }
    event.preventDefault();
    tabRefs.current[next]?.focus();
    if (activation === "automatic") {
      select(items[next].value);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={cn("flex gap-1 overflow-x-auto border-b border-ink/10", listClassName)}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selected;
          return (
            <button
              key={item.value}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${index}`}
              aria-selected={isSelected}
              aria-controls={`${baseId}-panel-${index}`}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => select(item.value)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap",
                "transition-colors duration-fast ease-standard",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary text-ink"
                  : "border-transparent text-muted hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          role="tabpanel"
          id={`${baseId}-panel-${index}`}
          aria-labelledby={`${baseId}-tab-${index}`}
          tabIndex={0}
          hidden={item.value !== selected}
          className={cn(
            "pt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            panelClassName,
          )}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
