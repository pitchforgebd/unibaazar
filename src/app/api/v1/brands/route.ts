import { prisma } from "@/lib/db";
import { handle } from "@/server/http";

export async function GET() {
  return handle(async () =>
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, description: true },
    }),
  );
}
