import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { claimWebhookEvent } from "@/modules/payments/server/idempotency";
import { InvalidRefundError, refundPayment } from "@/modules/payments/server/refund";
import { transitionPayment } from "@/modules/payments/server/transition";
import { IllegalPaymentTransitionError } from "@/modules/payments/state-machine";

describe("payments module (requires .env.test's DATABASE_URL)", () => {
  afterAll(async () => {
    await prisma.order.deleteMany({ where: { phone: "01998888888" } });
    await prisma.paymentWebhookEvent.deleteMany({ where: { provider: "test-provider" } });
    await prisma.$disconnect();
  });

  async function makeOrderWithPayment(amount = "500.00") {
    const order = await prisma.order.create({
      data: {
        number: `TESTPAY${randomUUID().slice(0, 8)}`,
        name: "Test Customer",
        phone: "01998888888",
        addressLine: "Test address",
        area: "INSIDE_DHAKA",
        paymentMethod: "CARD",
        subtotal: amount,
        total: amount,
        status: "PENDING",
        payments: {
          create: { method: "CARD", status: "PENDING", amount },
        },
      },
      include: { payments: true },
    });
    return { order, payment: order.payments[0] };
  }

  describe("transitionPayment", () => {
    it("rejects an illegal transition and writes no history", async () => {
      const { payment } = await makeOrderWithPayment();
      await expect(
        prisma.$transaction((tx) =>
          transitionPayment(tx, payment, "REFUNDED", "skip ahead"),
        ),
      ).rejects.toBeInstanceOf(IllegalPaymentTransitionError);

      const unchanged = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(unchanged.status).toBe("PENDING");
      const history = await prisma.paymentStatusHistory.findMany({
        where: { paymentId: payment.id },
      });
      expect(history).toHaveLength(0);
    });

    it("moves PENDING -> PAID and writes one history row", async () => {
      const { payment } = await makeOrderWithPayment();
      await prisma.$transaction((tx) =>
        transitionPayment(tx, payment, "PAID", "gateway ok"),
      );

      const updated = await prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      expect(updated.status).toBe("PAID");
      const history = await prisma.paymentStatusHistory.findMany({
        where: { paymentId: payment.id },
      });
      expect(history.map((h) => h.status)).toEqual(["PAID"]);
    });

    it("a failed payment can retry to PENDING but a refunded one is final", async () => {
      const { payment } = await makeOrderWithPayment();
      const failed = await prisma.$transaction((tx) =>
        transitionPayment(tx, payment, "FAILED", "declined"),
      );
      const retried = await prisma.$transaction((tx) =>
        transitionPayment(tx, failed, "PENDING", "customer retried"),
      );
      expect(retried.status).toBe("PENDING");

      const paid = await prisma.$transaction((tx) =>
        transitionPayment(tx, retried, "PAID", "ok this time"),
      );
      const refunded = await prisma.$transaction((tx) =>
        transitionPayment(tx, paid, "REFUNDED", "customer returned it"),
      );
      await expect(
        prisma.$transaction((tx) =>
          transitionPayment(tx, refunded, "PENDING", "re-raise"),
        ),
      ).rejects.toBeInstanceOf(IllegalPaymentTransitionError);
    });
  });

  describe("refundPayment", () => {
    it("rejects refunding a payment that was never paid", async () => {
      const { payment } = await makeOrderWithPayment();
      await expect(
        prisma.$transaction((tx) => refundPayment(tx, payment, 100, "too early")),
      ).rejects.toBeInstanceOf(InvalidRefundError);
    });

    it("a partial refund moves to PARTIALLY_REFUNDED and tracks the running total", async () => {
      const { payment } = await makeOrderWithPayment("500.00");
      const paid = await prisma.$transaction((tx) =>
        transitionPayment(tx, payment, "PAID", null),
      );

      const afterFirst = await prisma.$transaction((tx) =>
        refundPayment(tx, paid, 200, "partial refund 1"),
      );
      expect(afterFirst.status).toBe("PARTIALLY_REFUNDED");
      expect(afterFirst.refundedAmount.toNumber()).toBe(200);

      // A second partial refund while already PARTIALLY_REFUNDED is a
      // same-status amount update, not an illegal self-transition.
      const afterSecond = await prisma.$transaction((tx) =>
        refundPayment(tx, afterFirst, 100, "partial refund 2"),
      );
      expect(afterSecond.status).toBe("PARTIALLY_REFUNDED");
      expect(afterSecond.refundedAmount.toNumber()).toBe(300);

      const history = await prisma.paymentStatusHistory.findMany({
        where: { paymentId: payment.id },
        orderBy: { createdAt: "asc" },
      });
      expect(history.map((h) => h.status)).toEqual([
        "PAID",
        "PARTIALLY_REFUNDED",
        "PARTIALLY_REFUNDED",
      ]);
    });

    it("topping a partial refund up to the full amount reaches REFUNDED", async () => {
      const { payment } = await makeOrderWithPayment("500.00");
      const paid = await prisma.$transaction((tx) =>
        transitionPayment(tx, payment, "PAID", null),
      );
      const partial = await prisma.$transaction((tx) =>
        refundPayment(tx, paid, 300, "partial"),
      );
      const full = await prisma.$transaction((tx) =>
        refundPayment(tx, partial, 200, "rest"),
      );
      expect(full.status).toBe("REFUNDED");
      expect(full.refundedAmount.toNumber()).toBe(500);
    });

    it("rejects a refund that would exceed the payment's total", async () => {
      const { payment } = await makeOrderWithPayment("500.00");
      const paid = await prisma.$transaction((tx) =>
        transitionPayment(tx, payment, "PAID", null),
      );
      await expect(
        prisma.$transaction((tx) => refundPayment(tx, paid, 600, "too much")),
      ).rejects.toBeInstanceOf(InvalidRefundError);
    });
  });

  describe("claimWebhookEvent", () => {
    it("the first delivery of an event key succeeds, every repeat is rejected", async () => {
      const key = `evt-${randomUUID()}`;
      const first = await claimWebhookEvent(prisma, "test-provider", key);
      expect(first).toBe(true);
      const second = await claimWebhookEvent(prisma, "test-provider", key);
      expect(second).toBe(false);
      const third = await claimWebhookEvent(prisma, "test-provider", key);
      expect(third).toBe(false);
    });

    it("concurrent deliveries of the same event key: exactly one wins", async () => {
      const key = `evt-concurrent-${randomUUID()}`;
      const results = await Promise.all(
        Array.from({ length: 5 }, () => claimWebhookEvent(prisma, "test-provider", key)),
      );
      expect(results.filter(Boolean)).toHaveLength(1);
    });
  });
});
