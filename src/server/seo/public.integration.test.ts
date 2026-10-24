import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { findActiveRedirect } from "./public";

describe("findActiveRedirect (requires .env.test's DATABASE_URL)", () => {
  const fromPaths: string[] = [];

  afterAll(async () => {
    await prisma.redirect.deleteMany({ where: { fromPath: { in: fromPaths } } });
    await prisma.$disconnect();
  });

  async function makeRedirect(overrides: {
    toPath: string;
    statusCode?: number;
    isActive?: boolean;
  }) {
    const fromPath = `/test-redirect-${randomUUID().slice(0, 8)}`;
    fromPaths.push(fromPath);
    await prisma.redirect.create({
      data: {
        fromPath,
        toPath: overrides.toPath,
        statusCode: overrides.statusCode ?? 301,
        isActive: overrides.isActive ?? true,
      },
    });
    return fromPath;
  }

  it("returns the target and status code for an active redirect", async () => {
    const fromPath = await makeRedirect({ toPath: "/shop", statusCode: 301 });
    expect(await findActiveRedirect(fromPath)).toEqual({
      toPath: "/shop",
      statusCode: 301,
    });
  });

  it("returns null for a path with no redirect row at all", async () => {
    expect(await findActiveRedirect(`/never-created-${randomUUID()}`)).toBeNull();
  });

  it("returns null for a redirect an admin has turned off", async () => {
    const fromPath = await makeRedirect({ toPath: "/shop", isActive: false });
    expect(await findActiveRedirect(fromPath)).toBeNull();
  });

  it("returns null for a redirect that points at itself", async () => {
    const fromPath = `/test-redirect-${randomUUID().slice(0, 8)}`;
    fromPaths.push(fromPath);
    await prisma.redirect.create({
      data: { fromPath, toPath: fromPath, statusCode: 301, isActive: true },
    });
    expect(await findActiveRedirect(fromPath)).toBeNull();
  });

  it("returns 302 correctly, not just 301", async () => {
    const fromPath = await makeRedirect({ toPath: "/cart", statusCode: 302 });
    expect(await findActiveRedirect(fromPath)).toEqual({
      toPath: "/cart",
      statusCode: 302,
    });
  });
});
