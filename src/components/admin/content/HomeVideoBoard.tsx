"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteHomeVideoAction,
  homeVideoAction,
} from "@/app/(admin)/admin/content-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Stagger, StaggerItem } from "@/components/motion";

type HomeVideoRow = { id: string; title: string; youtubeUrl: string; isActive: boolean };

const blankForm = { id: "", title: "", youtubeUrl: "" };

export function HomeVideoBoard({ rows }: { rows: HomeVideoRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(blankForm);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function edit(row: HomeVideoRow) {
    setForm({ id: row.id, title: row.title, youtubeUrl: row.youtubeUrl });
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Homepage videos</h1>
        <p className="text-sm text-muted">
          Shown in a row right under Testimonials on the homepage. The first 4 active
          videos, in this order, are used.
        </p>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No videos yet.</p> : null}
      <Stagger as="ul" className="space-y-3">
        {rows.map((row) => (
          <StaggerItem as="li" key={row.id}>
            <div className="flex items-center justify-between gap-3 rounded-theme bg-card p-4 shadow-soft">
              <div>
                <p className="font-semibold text-ink">{row.title}</p>
                <p className="text-xs text-muted">{row.youtubeUrl}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => edit(row)}>
                  Edit
                </Button>
                <DeleteButton
                  action={() => deleteHomeVideoAction({ id: row.id })}
                  confirmText={`Delete video ${row.title}?`}
                />
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <form
        className="space-y-3 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void homeVideoAction(form).then((result) => {
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
          <h2 className="font-semibold text-ink">
            {form.id ? "Edit video" : "New video"}
          </h2>
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
          label="Title"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <Input
          label="YouTube link"
          value={form.youtubeUrl}
          onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <Button type="submit" isLoading={pending} loadingLabel="Saving…">
          {form.id ? "Save changes" : "Save video"}
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
