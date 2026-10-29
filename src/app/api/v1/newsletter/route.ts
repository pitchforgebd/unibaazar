import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { newsletterSchema } from "@/lib/validation/customer";
import { guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = newsletterSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  try {
    await guardWrite(request, "newsletter", parsed.data.captchaToken, parsed.data.email);
    const email = parsed.data.email.trim().toLowerCase();
    await prisma.subscriber.upsert({ where: { email }, update: {}, create: { email } });
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
