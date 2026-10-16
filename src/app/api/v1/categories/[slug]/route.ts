import { prisma } from "@/lib/db";
import { ApiError, handle } from "@/server/http";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  return handle(async () => {
    const category = await prisma.category.findFirst({
      where: { slug, isActive: true },
      select: { slug: true, name: true, description: true, seoText: true },
    });
    if (!category) {
      throw new ApiError(404, "Category not found");
    }
    return category;
  });
}
