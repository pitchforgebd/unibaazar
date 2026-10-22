export type Orientation = "horizontal" | "vertical";

/**
 * The next focus target for a roving-tabindex widget (tabs, toolbars),
 * skipping disabled items and wrapping at the ends. Returns null for keys
 * the widget shouldn't handle, so the caller leaves those events alone.
 */
export function nextRovingIndex(
  current: number,
  key: string,
  disabled: readonly boolean[],
  orientation: Orientation = "horizontal",
): number | null {
  const count = disabled.length;
  if (count === 0 || disabled.every(Boolean)) {
    return null;
  }
  const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
  const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

  const scan = (start: number, step: 1 | -1): number => {
    let index = start;
    for (let i = 0; i < count; i += 1) {
      if (!disabled[index]) {
        return index;
      }
      index = (index + step + count) % count;
    }
    return start;
  };

  switch (key) {
    case nextKey:
      return scan((current + 1) % count, 1);
    case prevKey:
      return scan((current - 1 + count) % count, -1);
    case "Home":
      return scan(0, 1);
    case "End":
      return scan(count - 1, -1);
    default:
      return null;
  }
}
