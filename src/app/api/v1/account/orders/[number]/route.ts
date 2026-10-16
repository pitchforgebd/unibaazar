import { orderForSession } from "@/server/orders/orders";
import { handle } from "@/server/http";

type Context = { params: Promise<{ number: string }> };

export async function GET(_request: Request, context: Context) {
  const { number } = await context.params;
  return handle(() => orderForSession(number));
}
