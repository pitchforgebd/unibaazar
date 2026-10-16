import { prisma } from "@/lib/db";
import { handle } from "@/server/http";

export async function GET() {
  return handle(async () =>
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, description: true, seoText: true },
    }),
  );
}
