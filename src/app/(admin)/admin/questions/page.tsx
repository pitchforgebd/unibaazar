import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { QuestionList } from "@/components/admin/catalog/CatalogRecords";
import { catalogAccess } from "@/server/admin/access";
import { listQuestions } from "@/server/admin/moderation";

export const metadata: Metadata = { title: "Questions" };

export default async function QuestionsPage() {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const questions = await listQuestions();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Questions</h1>
      <QuestionList questions={questions} />
    </div>
  );
}
