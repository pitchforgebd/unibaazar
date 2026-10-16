import type { Metadata } from "next";
import { ContentDenied } from "@/components/admin/content/ContentDenied";
import { ContentNav } from "@/components/admin/content/ContentNav";
import { TestimonialBoard } from "@/components/admin/content/TestimonialBoard";
import { contentAccess } from "@/server/admin/access";
import { listTestimonials } from "@/server/admin/content";

export const metadata: Metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const session = await contentAccess();
  if (!session) {
    return <ContentDenied />;
  }
  const rows = await listTestimonials();
  return (
    <div className="space-y-4">
      <ContentNav />
      <TestimonialBoard rows={rows} />
    </div>
  );
}
