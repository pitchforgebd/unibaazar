import { describe, expect, it } from "vitest";
import { bucketStatusFunnel } from "./dashboard";

describe("bucketStatusFunnel", () => {
  const today = new Date("2026-10-23T00:00:00+06:00");
  const week = new Date("2026-10-17T00:00:00+06:00");

  it("counts every known status, defaulting to zero", () => {
    const rows = bucketStatusFunnel([], { today, week });
    expect(rows.find((row) => row.status === "PENDING")).toEqual({
      status: "PENDING",
      today: 0,
      week: 0,
      month: 0,
    });
    // Every status in the enum appears exactly once.
    expect(new Set(rows.map((row) => row.status)).size).toBe(rows.length);
  });

  it("buckets an order into today, week, and month at once", () => {
    const rows = bucketStatusFunnel(
      [{ status: "DELIVERED", placedAt: new Date("2026-10-23T08:00:00+06:00") }],
      { today, week },
    );
    const delivered = rows.find((row) => row.status === "DELIVERED");
    expect(delivered).toEqual({ status: "DELIVERED", today: 1, week: 1, month: 1 });
  });

  it("counts an order only in week and month when it falls before today", () => {
    const rows = bucketStatusFunnel(
      [{ status: "CONFIRMED", placedAt: new Date("2026-10-20T08:00:00+06:00") }],
      { today, week },
    );
    const confirmed = rows.find((row) => row.status === "CONFIRMED");
    expect(confirmed).toEqual({ status: "CONFIRMED", today: 0, week: 1, month: 1 });
  });

  it("counts an order only in month when it falls before the week boundary", () => {
    const rows = bucketStatusFunnel(
      [{ status: "CANCELLED", placedAt: new Date("2026-10-10T08:00:00+06:00") }],
      { today, week },
    );
    const cancelled = rows.find((row) => row.status === "CANCELLED");
    expect(cancelled).toEqual({ status: "CANCELLED", today: 0, week: 0, month: 1 });
  });

  it("treats the week boundary itself as inside the week window", () => {
    const rows = bucketStatusFunnel([{ status: "SHIPPED", placedAt: week }], {
      today,
      week,
    });
    const shipped = rows.find((row) => row.status === "SHIPPED");
    expect(shipped).toEqual({ status: "SHIPPED", today: 0, week: 1, month: 1 });
  });

  it("tallies multiple orders of the same status", () => {
    const rows = bucketStatusFunnel(
      [
        { status: "PENDING", placedAt: new Date("2026-10-23T01:00:00+06:00") },
        { status: "PENDING", placedAt: new Date("2026-10-23T02:00:00+06:00") },
        { status: "PENDING", placedAt: new Date("2026-10-19T02:00:00+06:00") },
      ],
      { today, week },
    );
    const pending = rows.find((row) => row.status === "PENDING");
    expect(pending).toEqual({ status: "PENDING", today: 2, week: 3, month: 3 });
  });
});
