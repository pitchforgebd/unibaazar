import { afterEach, describe, expect, it, vi } from "vitest";
import { startPageTransition, supportsViewTransitions } from "./viewTransition";

function stubBrowser({
  viewTransitions,
  reduced,
}: {
  viewTransitions: boolean;
  reduced: boolean;
}) {
  const startViewTransition = vi.fn((update: () => void | Promise<void>) => {
    const done = Promise.resolve().then(update);
    return { updateCallbackDone: done, ready: Promise.reject(new Error("skipped")) };
  });
  vi.stubGlobal("document", viewTransitions ? { startViewTransition } : {});
  vi.stubGlobal("window", { matchMedia: () => ({ matches: reduced }) });
  return startViewTransition;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startPageTransition", () => {
  it("is unsupported on the server", () => {
    expect(supportsViewTransitions()).toBe(false);
  });

  it("wraps the update in a View Transition when supported", async () => {
    const start = stubBrowser({ viewTransitions: true, reduced: false });
    const update = vi.fn();
    await startPageTransition(update);
    expect(start).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
  });

  it("runs the update directly when View Transitions are unsupported", async () => {
    stubBrowser({ viewTransitions: false, reduced: false });
    const update = vi.fn();
    await startPageTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });

  it("skips the transition under reduced motion", async () => {
    const start = stubBrowser({ viewTransitions: true, reduced: true });
    const update = vi.fn();
    await startPageTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
  });

  it("propagates a failing update", async () => {
    stubBrowser({ viewTransitions: true, reduced: false });
    await expect(
      startPageTransition(() => {
        throw new Error("nav failed");
      }),
    ).rejects.toThrow("nav failed");
  });
});
