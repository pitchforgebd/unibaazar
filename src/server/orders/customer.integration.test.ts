import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { customerFor } from "@/server/orders/orders";

function phone(): string {
  return `019${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

describe("customerFor (requires .env.test's DATABASE_URL)", () => {
  const phones: string[] = [];
  const userIds: string[] = [];

  async function user(): Promise<string> {
    const role = await prisma.role.findFirstOrThrow();
    const created = await prisma.user.create({
      data: {
        name: "Customer Link Test",
        phone: phone(),
        email: `${randomUUID()}@example.test`,
        passwordHash: "x",
        roleId: role.id,
      },
    });
    userIds.push(created.id);
    return created.id;
  }

  function nextPhone(): string {
    const value = phone();
    phones.push(value);
    return value;
  }

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { phone: { in: phones } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("links a shopper's first phone to their account", async () => {
    const userId = await user();
    const customer = await customerFor(nextPhone(), "A", "", userId);
    expect(customer.userId).toBe(userId);
  });

  it("lets the same account order with a second phone number", async () => {
    const userId = await user();
    const first = nextPhone();
    const second = nextPhone();
    await customerFor(first, "A", "", userId);

    const customer = await customerFor(second, "A", "", userId);

    expect(customer.phone).toBe(second);
    expect(customer.userId).toBeNull();
    const linked = await prisma.customer.findUniqueOrThrow({ where: { userId } });
    expect(linked.phone).toBe(first);
  });

  it("keeps working when they return to their first phone", async () => {
    const userId = await user();
    const first = nextPhone();
    await customerFor(first, "A", "", userId);
    const customer = await customerFor(first, "A B", "", userId);
    expect(customer.userId).toBe(userId);
    expect(customer.name).toBe("A B");
  });

  it("works for a guest", async () => {
    const customer = await customerFor(nextPhone(), "Guest", "");
    expect(customer.userId).toBeNull();
  });
});
