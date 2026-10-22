import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALERT_DIALOG_POLICY, canDismiss, DIALOG_POLICY, lockScroll } from "./overlay";

describe("canDismiss", () => {
  it("Dialog closes on Escape, backdrop click and the close button", () => {
    expect(canDismiss("escape", DIALOG_POLICY)).toBe(true);
    expect(canDismiss("backdrop", DIALOG_POLICY)).toBe(true);
    expect(canDismiss("close-button", DIALOG_POLICY)).toBe(true);
  });

  it("AlertDialog ignores an outside (backdrop) click but still honours Escape", () => {
    expect(canDismiss("backdrop", ALERT_DIALOG_POLICY)).toBe(false);
    expect(canDismiss("escape", ALERT_DIALOG_POLICY)).toBe(true);
  });

  it("nothing dismisses a busy overlay — not even Escape", () => {
    const busy = { ...ALERT_DIALOG_POLICY, busy: true };
    expect(canDismiss("escape", busy)).toBe(false);
    expect(canDismiss("close-button", busy)).toBe(false);
    expect(canDismiss("backdrop", busy)).toBe(false);
  });
});

describe("lockScroll", () => {
  const style = { overflow: "auto" };

  beforeEach(() => {
    style.overflow = "auto";
    vi.stubGlobal("document", { documentElement: { style } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("locks once and restores the original value when released", () => {
    const release = lockScroll();
    expect(style.overflow).toBe("hidden");
    release();
    expect(style.overflow).toBe("auto");
  });

  it("nested locks only restore scrolling after the last release", () => {
    const outer = lockScroll();
    const inner = lockScroll();
    outer();
    expect(style.overflow).toBe("hidden");
    inner();
    expect(style.overflow).toBe("auto");
  });

  it("a release called twice does not unlock someone else's lock", () => {
    const first = lockScroll();
    const second = lockScroll();
    first();
    first();
    expect(style.overflow).toBe("hidden");
    second();
    expect(style.overflow).toBe("auto");
  });
});
