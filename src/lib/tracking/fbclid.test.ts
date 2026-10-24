import { describe, expect, it } from "vitest";
import { parseCookie } from "./fbclid";

describe("parseCookie", () => {
  it("reads a cookie value from a multi-cookie string", () => {
    expect(parseCookie("a=1; _fbp=fb.1.123.456; b=2", "_fbp")).toBe("fb.1.123.456");
  });

  it("reads the cookie when it's the first one", () => {
    expect(parseCookie("_fbc=fb.1.789.abc; other=x", "_fbc")).toBe("fb.1.789.abc");
  });

  it("returns undefined when the cookie isn't present", () => {
    expect(parseCookie("a=1; b=2", "_fbp")).toBeUndefined();
  });

  it("returns undefined for an empty cookie string", () => {
    expect(parseCookie("", "_fbp")).toBeUndefined();
  });

  it("doesn't match a cookie whose name is a substring of another", () => {
    expect(parseCookie("_fbp_extra=nope; _fbp=real", "_fbp")).toBe("real");
  });

  it("decodes a URL-encoded cookie value", () => {
    expect(parseCookie("_fbc=fb.1.789.a%2Fb", "_fbc")).toBe("fb.1.789.a/b");
  });
});
