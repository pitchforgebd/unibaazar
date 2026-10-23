"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeTagAction, renameTagAction } from "@/app/(admin)/admin/catalog-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";

export function TagManager({ tags }: { tags: { tag: string; count: number }[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [from, setFrom] = useState(tags[0]?.tag ?? "");
  const [to, setTo] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <ul className="rounded-theme bg-card shadow-soft">
        {tags.length === 0 ? (
          <li className="p-4 text-sm text-muted">No tags yet. Add them on a product.</li>
        ) : null}
        {tags.map((tag) => (
          <li
            key={tag.tag}
            className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm last:border-0"
          >
            <span className="text-ink">
              {tag.tag} · {tag.count}
            </span>
            <DeleteButton
              action={() => removeTagAction(tag.tag)}
              label="Remove"
              confirmText={`Remove the tag "${tag.tag}" from every product?`}
            />
          </li>
        ))}
      </ul>
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void renameTagAction(from, to).then((result) => {
            setPending(false);
            push({ message: result.message, type: result.ok ? "success" : "error" });
            if (result.ok) router.refresh();
          });
        }}
      >
        <h2 className="font-heading font-semibold text-ink">Rename a tag</h2>
        <Select
          label="Tag"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        >
          {tags.map((tag) => (
            <option key={tag.tag} value={tag.tag}>
              {tag.tag}
            </option>
          ))}
        </Select>
        <Input
          label="New tag"
          value={to}
          placeholder="New name"
          onChange={(event) => setTo(event.target.value)}
        />
        <Button type="submit" isLoading={pending}>
          Rename
        </Button>
      </form>
    </div>
  );
}
