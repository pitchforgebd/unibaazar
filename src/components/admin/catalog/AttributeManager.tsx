"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteAttributeAction,
  deleteAttributeValueAction,
  saveAttributeAction,
  saveAttributeValueAction,
} from "@/app/(admin)/admin/catalog-actions";
import { slugify } from "@/components/admin/catalog/slugify";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useToastStore } from "@/store/toast";
import type {
  AttributeFormValues,
  AttributeValueFormValues,
} from "@/lib/validation/admin-catalog";

export function AttributeManager({
  rows,
  editing,
}: {
  rows: {
    id: string;
    name: string;
    slug: string;
    style: "BUTTON" | "SWATCH";
    values: { id: string; label: string; swatch: string | null; sortOrder: number }[];
    _count: { products: number };
  }[];
  editing: AttributeFormValues;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [pending, setPending] = useState(false);
  const [valueForm, setValueForm] = useState<AttributeValueFormValues>({
    id: "",
    attributeId: editing.id,
    label: "",
    swatch: "",
    sortOrder: "0",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Stagger as="div" className="space-y-3">
        {rows.map((row) => (
          <StaggerItem key={row.id}>
            <section className="rounded-theme bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-heading font-semibold text-ink">{row.name}</h2>
                  <p className="text-xs text-muted">
                    {row.style === "SWATCH" ? "Color swatch" : "Button"} ·{" "}
                    {row._count.products} products
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/attributes?id=${row.id}`}
                    className="text-xs font-semibold text-primary"
                  >
                    Edit
                  </Link>
                  <DeleteButton
                    action={() => deleteAttributeAction(row.id)}
                    confirmText={`Delete "${row.name}"? This can't be undone.`}
                  />
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {row.values.map((value) => (
                  <li key={value.id}>
                    <Badge variant="outline" className="gap-2 py-1">
                      {value.swatch ? (
                        <span
                          className="inline-block size-3 rounded-full border border-black/10"
                          style={{ background: value.swatch }}
                        />
                      ) : null}
                      {value.label}
                      <button
                        type="button"
                        className="font-semibold text-primary"
                        onClick={() =>
                          void deleteAttributeValueAction(value.id).then((result) => {
                            push({
                              message: result.message,
                              type: result.ok ? "success" : "error",
                            });
                            if (result.ok) router.refresh();
                          })
                        }
                      >
                        Remove
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </StaggerItem>
        ))}
      </Stagger>
      <div className="space-y-4">
        <form
          className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            setPending(true);
            void saveAttributeAction(form).then((result) => {
              setPending(false);
              push({ message: result.message, type: result.ok ? "success" : "error" });
              if (result.ok && result.id) {
                router.push(`/admin/attributes?id=${result.id}`);
              }
            });
          }}
        >
          <h2 className="font-heading font-semibold text-ink">
            {form.id ? "Edit attribute" : "Add attribute"}
          </h2>
          <Input
            label="Name"
            value={form.name}
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
                slug: slugTouched ? form.slug : slugify(event.target.value),
              })
            }
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setForm({ ...form, slug: event.target.value });
            }}
          />
          <Select
            label="Style"
            value={form.style}
            onChange={(event) =>
              setForm({
                ...form,
                style: event.target.value as AttributeFormValues["style"],
              })
            }
          >
            <option value="BUTTON">Button / label</option>
            <option value="SWATCH">Color swatch</option>
          </Select>
          <Button type="submit" isLoading={pending}>
            Save attribute
          </Button>
        </form>
        {form.id ? (
          <form
            className="space-y-4 rounded-theme bg-card p-4 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAttributeValueAction({ ...valueForm, attributeId: form.id }).then(
                (result) => {
                  push({
                    message: result.message,
                    type: result.ok ? "success" : "error",
                  });
                  if (result.ok) {
                    setValueForm({ ...valueForm, label: "", swatch: "" });
                    router.refresh();
                  }
                },
              );
            }}
          >
            <h2 className="font-heading font-semibold text-ink">Add value</h2>
            <Input
              label="Value"
              value={valueForm.label}
              placeholder="Red"
              onChange={(event) =>
                setValueForm({ ...valueForm, label: event.target.value })
              }
            />
            <Input
              label="Swatch"
              value={valueForm.swatch}
              placeholder="#F95B09"
              onChange={(event) =>
                setValueForm({ ...valueForm, swatch: event.target.value })
              }
            />
            <Input
              label="Sort order"
              value={valueForm.sortOrder}
              onChange={(event) =>
                setValueForm({ ...valueForm, sortOrder: event.target.value })
              }
            />
            <Button type="submit" variant="outline">
              Save value
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
