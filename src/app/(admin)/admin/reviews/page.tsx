import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { ReviewList } from "@/components/admin/catalog/CatalogRecords";
import { catalogAccess } from "@/server/admin/access";
import { listReviews } from "@/server/admin/moderation";

export const metadata: Metadata = { title: "Reviews" };

type ReviewsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const params = await searchParams;
  const status = Array.isArray(params.status)
    ? (params.status[0] ?? "")
    : (params.status ?? "");
  const reviews = await listReviews(status);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Reviews</h1>
      <ReviewList status={status} reviews={reviews} />
    </div>
  );
}
