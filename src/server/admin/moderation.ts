import { Prisma, type ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  questionAnswerSchema,
  reviewModerationSchema,
} from "@/lib/validation/admin-catalog";

function reviewStatus(status: string): ReviewStatus | undefined {
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    return status;
  }
  return undefined;
}

export async function listReviews(status: string) {
  const filter = reviewStatus(status);
  return prisma.review.findMany({
    where: filter ? { status: filter } : {},
    include: { product: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

async function refreshReviewStats(productId: string): Promise<void> {
  const approved = await prisma.review.findMany({
    where: { productId, status: "APPROVED" },
    select: { rating: true },
  });
  const rating =
    approved.length === 0
      ? 0
      : approved.reduce((sum, review) => sum + review.rating, 0) / approved.length;
  await prisma.product.update({
    where: { id: productId },
    data: { reviewCount: approved.length, rating: new Prisma.Decimal(rating.toFixed(2)) },
  });
}

export async function moderateReview(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
): Promise<void> {
  const parsed = reviewModerationSchema.parse({ id, status });
  const review = await prisma.review.update({
    where: { id: parsed.id },
    data: { status: parsed.status },
    select: { productId: true },
  });
  await refreshReviewStats(review.productId);
}

export async function importReviewsCsv(csv: string): Promise<string> {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("Add a header row and at least one review");
  }
  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((part) => part.trim());
  const slugIndex = header.indexOf("slug");
  const authorIndex = header.indexOf("author");
  const ratingIndex = header.indexOf("rating");
  const commentIndex = header.indexOf("comment");
  if (slugIndex < 0 || authorIndex < 0 || ratingIndex < 0 || commentIndex < 0) {
    throw new Error("CSV needs slug, author, rating, and comment columns");
  }
  let created = 0;
  const touched = new Set<string>();
  for (const line of lines.slice(1, 201)) {
    const cells = line.split(",").map((part) => part.trim().replace(/^"|"$/g, ""));
    const slug = cells[slugIndex] ?? "";
    const authorName = cells[authorIndex] ?? "";
    const rating = Number(cells[ratingIndex]);
    const comment = cells[commentIndex] ?? "";
    if (
      !slug ||
      !authorName ||
      !comment ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      continue;
    }
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!product) {
      continue;
    }
    await prisma.review.create({
      data: {
        productId: product.id,
        authorName: authorName.slice(0, 191),
        rating,
        comment: comment.slice(0, 2000),
        status: "APPROVED",
      },
    });
    touched.add(product.id);
    created += 1;
  }
  for (const productId of touched) {
    await refreshReviewStats(productId);
  }
  return created === 1 ? "1 review imported." : `${created} reviews imported.`;
}

export async function listQuestions() {
  return prisma.productQuestion.findMany({
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function answerQuestion(id: string, answer: string): Promise<void> {
  const parsed = questionAnswerSchema.parse({ id, answer });
  await prisma.productQuestion.update({
    where: { id: parsed.id },
    data: { answer: parsed.answer, answeredAt: new Date() },
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  await prisma.productQuestion.delete({ where: { id } });
}
