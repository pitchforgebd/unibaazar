import { verifyPayment } from "@/server/payments/payments";
import { handle } from "@/server/http";

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get("order") ?? "";
  return handle(() => verifyPayment(orderNumber));
}
