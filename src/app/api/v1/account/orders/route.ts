import { ordersForSession } from "@/server/orders/orders";
import { handle } from "@/server/http";

export async function GET() {
  return handle(() => ordersForSession());
}
