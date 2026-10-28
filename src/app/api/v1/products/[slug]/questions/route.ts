import { NextResponse } from "next/server";
import { questionSchema } from "@/lib/validation/customer";
import { submitProductQuestion } from "@/server/catalog/products";
import { handle, readJson } from "@/server/http";
import { assertSameOrigin } from "@/server/security/origin";

type Context = { params: Promise<{ slug: string }> };

export async function POST(request: Request, context: Context) {
  const { slug } = await context.params;
  const parsed = questionSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  return handle(async () => {
    assertSameOrigin(request);
    await submitProductQuestion(slug, parsed.data);
    return { ok: true };
  });
}
