"use client";

import { useState, type ReactNode } from "react";
import { uploadAdminImage } from "@/components/admin/common/uploadAdminImage";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { controlBase } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@/server/admin/result";

export type SettingsField = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "password" | "checkbox" | "select" | "image";
  options?: { value: string; label: string }[];
  hint?: string;
  section?: string;
  sectionIntro?: string;
};

export function SettingsForm({
  title,
  intro,
  fields,
  initial,
  save,
  extra,
}: {
  title: string;
  intro: string;
  fields: SettingsField[];
  initial: Record<string, string | boolean>;
  save: (values: Record<string, string | boolean>) => Promise<ActionResult>;
  extra?: ReactNode;
}) {
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  function update(name: string, value: string | boolean): void {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function uploadField(name: string, file: File): Promise<void> {
    setUploading(name);
    const result = await uploadAdminImage(file);
    setUploading(null);
    if (result.ok && result.url) {
      update(name, result.url);
    } else {
      setMessage(result.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        <p className="text-sm text-muted">{intro}</p>
      </div>
      <form
        className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void save(values).then((result) => {
            setMessage(result.message);
            setPending(false);
          });
        }}
      >
        {fields.map((field, index) => {
          const previousSection = index > 0 ? fields[index - 1].section : undefined;
          const showSectionHeader = field.section && field.section !== previousSection;
          const current = values[field.name];
          const text = typeof current === "string" ? current : "";

          let body: ReactNode;
          if (field.kind === "checkbox") {
            body = (
              <Checkbox
                label={field.label}
                checked={current === true}
                onChange={(event) => update(field.name, event.target.checked)}
              />
            );
          } else if (field.kind === "image") {
            body = (
              <div className="space-y-2">
                <span className="block text-sm font-medium text-foreground">
                  {field.label}
                </span>
                {text ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={text}
                    alt=""
                    className="h-16 w-16 rounded-theme border border-muted bg-white object-contain"
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading === field.name}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadField(field.name, file);
                    }
                  }}
                  className={cn(
                    controlBase,
                    "h-11 cursor-pointer px-3 py-2 file:mr-3 file:rounded-theme file:border-0",
                    "file:bg-ink/5 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                />
                {uploading === field.name ? (
                  <span className="block text-xs text-muted">Uploading…</span>
                ) : field.hint ? (
                  <span className="block text-xs text-muted">{field.hint}</span>
                ) : null}
              </div>
            );
          } else if (field.kind === "textarea") {
            body = (
              <Textarea
                label={field.label}
                hint={field.hint}
                value={text}
                onChange={(event) => update(field.name, event.target.value)}
              />
            );
          } else if (field.kind === "select") {
            body = (
              <Select
                label={field.label}
                hint={field.hint}
                value={text}
                onChange={(event) => update(field.name, event.target.value)}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            );
          } else {
            body = (
              <Input
                label={field.label}
                hint={field.hint}
                type={
                  field.kind === "password"
                    ? "password"
                    : field.kind === "number"
                      ? "number"
                      : "text"
                }
                value={text}
                onChange={(event) => update(field.name, event.target.value)}
              />
            );
          }

          return (
            <div key={field.name}>
              {showSectionHeader ? (
                <div className="mb-3 border-t border-ink/5 pt-4 first:mt-0 first:border-0 first:pt-0">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-primary">
                    {field.section}
                  </h2>
                  {field.sectionIntro ? (
                    <p className="mt-0.5 text-xs text-muted">{field.sectionIntro}</p>
                  ) : null}
                </div>
              ) : null}
              {body}
            </div>
          );
        })}
        <Button type="submit" isLoading={pending} loadingLabel="Saving…">
          Save
        </Button>
        {message ? (
          <p role="status" className="text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </form>
      {extra}
    </div>
  );
}
