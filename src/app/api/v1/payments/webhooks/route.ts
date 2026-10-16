import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/seo/urls";
import { applySslcommerzIpn } from "@/server/payments/payments";
import { handle } from "@/server/http";

async function readFields(request: Request): Promise<Record<string, string>> {
  const form = await request.formData().catch(() => null);
  if (!form) {
    return {};
  }
  return Object.fromEntries(
    Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const event = url.searchParams.get("event");
  const fields = await readFields(request);

  if (!event) {
    return handle(() => applySslcommerzIpn(fields));
  }

  const tranId = encodeURIComponent(fields.tran_id ?? "");
  if (event === "success") {
    return NextResponse.redirect(absoluteUrl(`/order-success/${tranId}`), 303);
  }
  return NextResponse.redirect(
    absoluteUrl(`/track-order?order=${tranId}&payment=${event}`),
    303,
  );
}
