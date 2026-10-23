"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  answerQuestionAction,
  deleteQuestionAction,
} from "@/app/(admin)/admin/catalog-actions";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useToastStore } from "@/store/toast";

export function QuestionList({
  questions,
}: {
  questions: {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    product: { name: string };
  }[];
}) {
  return (
    <Stagger as="div" className="space-y-4">
      {questions.map((question) => (
        <StaggerItem key={question.id}>
          <QuestionCard question={question} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function QuestionCard({
  question,
}: {
  question: {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    product: { name: string };
  };
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <article className="rounded-theme bg-card p-4 shadow-soft">
      <p className="text-sm font-semibold text-ink">{question.product.name}</p>
      <p className="text-sm text-muted">{question.authorName}</p>
      <p className="mt-2 text-sm text-foreground">{question.question}</p>
      <Textarea
        label="Answer"
        hideLabel
        value={answer}
        className="mt-3"
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <Button
          isLoading={saving}
          onClick={() => {
            setSaving(true);
            void answerQuestionAction(question.id, answer).then((result) => {
              setSaving(false);
              push({ message: result.message, type: result.ok ? "success" : "error" });
            });
          }}
        >
          Save answer
        </Button>
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
      </div>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete question"
        description="This question and its answer will be removed for good."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={deleting}
        loadingLabel="Deleting…"
        onConfirm={() => {
          setDeleting(true);
          void deleteQuestionAction(question.id).then((result) => {
            setDeleting(false);
            if (result.ok) {
              setConfirmOpen(false);
              router.refresh();
              return;
            }
            push({ message: result.message, type: "error" });
          });
        }}
      />
    </article>
  );
}
