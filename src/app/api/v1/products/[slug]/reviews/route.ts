import { NextResponse } from "next/server";
import { reviewSchema } from "@/lib/validation/customer";
import { submitProductReview } from "@/server/catalog/products";
import { handle, readJson } from "@/server/http";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  const { slug } = await context.params;
  const parsed = reviewSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    await submitProductReview(slug, parsed.data);
    return { ok: true };
  });
}
