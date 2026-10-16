"use client";

import { useState, type ReactNode } from "react";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
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
    const body = new FormData();
    body.set("file", file);
    const result = await uploadCatalogImageAction(body);
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
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
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
          const body =
            field.kind === "checkbox" ? (
              <label
                key={field.name}
                className="flex items-center gap-2 text-sm font-semibold text-ink"
              >
                <input
                  type="checkbox"
                  checked={values[field.name] === true}
                  onChange={(event) => update(field.name, event.target.checked)}
                />
                {field.label}
              </label>
            ) : (
              (() => {
                const current = values[field.name];
                const text = typeof current === "string" ? current : "";
                return (
                  <label key={field.name} className="block text-sm">
                    <span className="mb-1 block font-semibold text-ink">
                      {field.label}
                    </span>
                    {field.kind === "image" ? (
                      <div className="space-y-2">
                        {text ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={text}
                            alt=""
                            className="h-16 w-16 rounded border border-black/10 bg-white object-contain"
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
                          className={fieldClass}
                        />
                        {uploading === field.name ? (
                          <span className="block text-xs text-muted">Uploading…</span>
                        ) : null}
                      </div>
                    ) : field.kind === "textarea" ? (
                      <textarea
                        value={text}
                        onChange={(event) => update(field.name, event.target.value)}
                        className={`${fieldClass} h-24 py-2`}
                      />
                    ) : field.kind === "select" ? (
                      <select
                        value={text}
                        onChange={(event) => update(field.name, event.target.value)}
                        className={fieldClass}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          field.kind === "password"
                            ? "password"
                            : field.kind === "number"
                              ? "number"
                              : "text"
                        }
                        value={text}
                        onChange={(event) => update(field.name, event.target.value)}
                        className={fieldClass}
                      />
                    )}
                    {field.hint ? (
                      <span className="mt-1 block text-xs text-muted">{field.hint}</span>
                    ) : null}
                  </label>
                );
              })()
            );
          return (
            <div key={field.name}>
              {showSectionHeader ? (
                <div className="mb-3 border-t border-black/5 pt-4 first:mt-0 first:border-0 first:pt-0">
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
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
      {extra}
    </div>
  );
}
