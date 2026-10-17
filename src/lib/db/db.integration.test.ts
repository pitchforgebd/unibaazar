import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";

describe("database connectivity (requires .env.test's DATABASE_URL, migrated + seeded)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can query the seeded admin user and a seeded product", async () => {
    const admin = await prisma.user.findFirst({ where: { phone: "01700000000" } });
    expect(admin).not.toBeNull();

    const product = await prisma.product.findFirst({
      where: { slug: "cotton-crew-tshirt" },
      include: { variants: true },
    });
    expect(product).not.toBeNull();
    expect(product?.variants.length).toBeGreaterThan(0);
  });

  it("has applied every committed migration", async () => {
    const applied = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
      "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL",
    );
    expect(applied.length).toBeGreaterThanOrEqual(13);
  });
});
