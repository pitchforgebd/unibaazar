import { describe, expect, it } from "vitest";
import { nextRovingIndex } from "./roving";

const none = [false, false, false, false];

describe("nextRovingIndex", () => {
  it("moves right/left and wraps at both ends", () => {
    expect(nextRovingIndex(0, "ArrowRight", none)).toBe(1);
    expect(nextRovingIndex(3, "ArrowRight", none)).toBe(0);
    expect(nextRovingIndex(0, "ArrowLeft", none)).toBe(3);
  });

  it("Home/End jump to the first/last enabled item", () => {
    const disabled = [true, false, false, true];
    expect(nextRovingIndex(2, "Home", disabled)).toBe(1);
    expect(nextRovingIndex(1, "End", disabled)).toBe(2);
  });

  it("skips disabled items, including across the wrap", () => {
    const disabled = [false, true, false, true];
    expect(nextRovingIndex(0, "ArrowRight", disabled)).toBe(2);
    expect(nextRovingIndex(2, "ArrowRight", disabled)).toBe(0);
    expect(nextRovingIndex(0, "ArrowLeft", disabled)).toBe(2);
  });

  it("uses Up/Down for vertical lists and ignores Left/Right there", () => {
    expect(nextRovingIndex(0, "ArrowDown", none, "vertical")).toBe(1);
    expect(nextRovingIndex(0, "ArrowUp", none, "vertical")).toBe(3);
    expect(nextRovingIndex(0, "ArrowRight", none, "vertical")).toBeNull();
  });

  it("returns null for unhandled keys and for all-disabled or empty lists", () => {
    expect(nextRovingIndex(0, "Enter", none)).toBeNull();
    expect(nextRovingIndex(0, "ArrowRight", [true, true])).toBeNull();
    expect(nextRovingIndex(0, "ArrowRight", [])).toBeNull();
  });
});
