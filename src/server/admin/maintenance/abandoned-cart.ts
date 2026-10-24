import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { siteOrigin } from "@/server/tracking/config";

const MIN_AGE_MS = 2 * 60 * 60 * 1000;
// Carts left this long are stale noise, not a realistic nudge target —
// keeps the daily run from re-scanning years of dead guest carts.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type AbandonedCartCandidate = {
  id: string;
  updatedAt: Date;
  email: string | null;
  name: string;
  lines: { name: string; qty: number }[];
};

/**
 * Pure filter, separate from the DB fetch below so it's directly
 * unit-testable (same split reconcile-payments.ts's aggregateMismatches()
 * uses). A cart only qualifies once it's sat untouched for at least
 * MIN_AGE_MS (still mid-browsing otherwise) and has an email on file —
 * guest carts identified only by a token cookie have no address to send
 * to and are silently skipped, not an error.
 */
export function selectAbandonedCarts(
  carts: AbandonedCartCandidate[],
  now: Date,
): AbandonedCartCandidate[] {
  return carts.filter((cart) => {
    if (!cart.email) {
      return false;
    }
    const age = now.getTime() - cart.updatedAt.getTime();
    return age >= MIN_AGE_MS && age <= MAX_AGE_MS;
  });
}

function reminderBody(name: string, lines: { name: string; qty: number }[]): string {
  const itemList = lines.map((line) => `- ${line.name} x${line.qty}`).join("\n");
  return `Hi ${name},\n\nYou left these items in your UniBaazar cart:\n\n${itemList}\n\nComplete your order before they sell out.`;
}

/**
 * Daily sweep, same shape as reconcile-payments.ts's reconcilePayments().
 * Dedupe is keyed on (cart id, cart's current updatedAt) via sendEmail's
 * own dedupeKey mechanism (src/lib/notify/dedupe.ts) — a cart that's
 * genuinely untouched since the last run's email won't be re-sent, but
 * one the customer came back to and changed (updatedAt moves) is
 * eligible again once it goes quiet past MIN_AGE_MS a second time.
 */
export async function sendAbandonedCartEmails(
  now: Date = new Date(),
): Promise<{ checked: number; queued: number }> {
  const carts = await prisma.cart.findMany({
    where: { status: "ACTIVE", items: { some: {} } },
    include: {
      customer: true,
      user: true,
      items: { include: { variant: { include: { product: true } } } },
    },
  });
  const candidates: AbandonedCartCandidate[] = carts.map((cart) => ({
    id: cart.id,
    updatedAt: cart.updatedAt,
    email: cart.customer?.email || cart.user?.email || null,
    name: cart.customer?.name || cart.user?.name || "there",
    lines: cart.items.map((item) => ({
      name: item.variant.product.name,
      qty: item.qty,
    })),
  }));
  const eligible = selectAbandonedCarts(candidates, now);
  for (const cart of eligible) {
    await sendEmail(
      cart.email!,
      "You left something in your cart",
      reminderBody(cart.name, cart.lines),
      `cart-abandoned:${cart.id}:${cart.updatedAt.toISOString()}`,
      { label: "Return to your cart", href: `${siteOrigin()}/cart` },
    );
  }
  return { checked: candidates.length, queued: eligible.length };
}
