import { prisma } from "@/lib/db";
import { setOrderStatus } from "@/server/admin/orders-admin";
import { assertCronSecret } from "@/server/cron/auth";
import { handle } from "@/server/http";

const unpaidAfterMs = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const stale = await prisma.order.findMany({
      where: {
        status: "PENDING",
        paymentMethod: { not: "COD" },
        placedAt: { lt: new Date(Date.now() - unpaidAfterMs) },
      },
      select: { id: true },
    });
    let cancelled = 0;
    for (const order of stale) {
      await setOrderStatus(
        null,
        order.id,
        "CANCELLED",
        "Auto-cancelled: unpaid after 24h",
      );
      cancelled += 1;
    }
    return { cancelled };
  });
}
