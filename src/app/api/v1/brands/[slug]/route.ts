import { prisma } from "@/lib/db";
import { ApiError, handle } from "@/server/http";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  return handle(async () => {
    const brand = await prisma.brand.findFirst({
      where: { slug, isActive: true },
      select: { slug: true, name: true, description: true },
    });
    if (!brand) {
      throw new ApiError(404, "Brand not found");
    }
    return brand;
  });
}
