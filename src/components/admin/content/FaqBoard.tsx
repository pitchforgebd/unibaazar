"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteFaqAction, faqAction } from "@/app/(admin)/admin/content-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Stagger, StaggerItem } from "@/components/motion";

type FaqRow = { id: string; question: string; answer: string; isActive: boolean };

const blankForm = { id: "", question: "", answer: "" };

export function FaqBoard({ rows }: { rows: FaqRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: FaqRow) {
    setForm({ id: row.id, question: row.question, answer: row.answer });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">FAQ</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No questions yet. The public FAQ page keeps its sample list until one is saved.
        </p>
      ) : null}
      <Stagger as="ul" className="space-y-3">
        {rows.map((row) => (
          <StaggerItem as="li" key={row.id}>
            <article className="rounded-theme bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-ink">{row.question}</h2>
                <div className="flex shrink-0 items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => edit(row)}>
                    Edit
                  </Button>
                  <DeleteButton
                    action={() => deleteFaqAction({ id: row.id })}
                    confirmText="Delete this FAQ?"
                  />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{row.answer}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void faqAction(form).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setForm(blankForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">{form.id ? "Edit FAQ" : "New FAQ"}</h2>
          {form.id ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm(blankForm);
                setMessage("");
              }}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>
        <Input
          label="Question"
          value={form.question}
          onChange={(event) => setForm({ ...form, question: event.target.value })}
        />
        <Textarea
          label="Answer"
          value={form.answer}
          onChange={(event) => setForm({ ...form, answer: event.target.value })}
        />
        <Button type="submit" isLoading={pending} loadingLabel="Saving…">
          {form.id ? "Save changes" : "Save FAQ"}
        </Button>
        {message ? (
          <p role="status" className="text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
