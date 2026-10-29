import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/customer";
import { alertContactMessage } from "@/server/admin/alerts";
import { guardWrite } from "@/server/security/guard";
import { ApiError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  try {
    await guardWrite(request, "contact", parsed.data.captchaToken, parsed.data.phone);
    await alertContactMessage(parsed.data);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
