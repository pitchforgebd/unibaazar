"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  answerQuestionAction,
  deleteAttributeAction,
  deleteAttributeValueAction,
  deleteBrandAction,
  deleteCategoryAction,
  deleteLabelAction,
  deleteQuestionAction,
  deleteUnitAction,
  importReviewsAction,
  moderateReviewAction,
  removeTagAction,
  renameTagAction,
  saveAttributeAction,
  saveAttributeValueAction,
  saveBrandAction,
  saveCategoryAction,
  saveLabelAction,
  saveUnitAction,
} from "@/app/(admin)/admin/catalog-actions";
import { RichTextField } from "@/components/admin/catalog/RichTextField";
import { SeoHints } from "@/components/admin/seo/SeoHints";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import type {
  AttributeFormValues,
  AttributeValueFormValues,
  BrandFormValues,
  CategoryFormValues,
  LabelFormValues,
  UnitFormValues,
} from "@/lib/validation/admin-catalog";
import type { CategoryRow } from "@/server/admin/taxonomy";

const areaClass =
  "min-h-24 w-full rounded-md border border-black/10 bg-card px-3 py-2 text-sm outline-none focus:border-primary";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

function Notice({ message }: { message: string }) {
  if (!message) {
    return null;
  }
  return <p className="text-sm font-semibold text-ink">{message}</p>;
}

export function CategoryManager({
  rows,
  editing,
}: {
  rows: CategoryRow[];
  editing: CategoryFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Products</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5">
                <td className="p-3" style={{ paddingLeft: 12 + row.depth * 16 }}>
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-muted">
                    {row.isActive ? row.slug : `${row.slug} · hidden`}
                  </p>
                </td>
                <td className="p-3">{row.productCount}</td>
                <td className="p-3">
                  <Link
                    href={`/admin/categories?id=${row.id}`}
                    className="font-semibold text-primary"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="ml-3 font-semibold"
                    onClick={() => {
                      void deleteCategoryAction(row.id).then((result) => {
                        setMessage(result.message);
                        if (result.ok) router.refresh();
                      });
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void saveCategoryAction(form).then((result) => {
            setMessage(result.message);
            if (result.ok) {
              router.push("/admin/categories");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">{form.id ? "Edit category" : "Add category"}</h2>
        <Notice message={message} />
        <input
          className={fieldClass}
          value={form.name}
          aria-label="Name"
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              slug: slugTouched ? form.slug : slugify(event.target.value),
            })
          }
        />
        <input
          className={fieldClass}
          value={form.slug}
          aria-label="Slug"
          onChange={(event) => {
            setSlugTouched(true);
            setForm({ ...form, slug: event.target.value });
          }}
        />
        <select
          className={fieldClass}
          value={form.parentId}
          aria-label="Parent category"
          onChange={(event) => setForm({ ...form, parentId: event.target.value })}
        >
          <option value="">No parent</option>
          {rows
            .filter((row) => row.id !== form.id)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {`${"— ".repeat(row.depth)}${row.name}`}
              </option>
            ))}
        </select>
        <textarea
          className={areaClass}
          value={form.description}
          aria-label="Description"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <RichTextField
          label="SEO text"
          value={form.seoText}
          onChange={(html) => setForm({ ...form, seoText: html })}
        />
        <input
          className={fieldClass}
          value={form.imageHue}
          aria-label="Image hue"
          placeholder="Image hue 0-360"
          onChange={(event) => setForm({ ...form, imageHue: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.sortOrder}
          aria-label="Sort order"
          onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.metaTitle}
          aria-label="Meta title"
          placeholder="Meta title"
          onChange={(event) => setForm({ ...form, metaTitle: event.target.value })}
        />
        <textarea
          className={areaClass}
          value={form.metaDescription}
          aria-label="Meta description"
          placeholder="Meta description"
          onChange={(event) => setForm({ ...form, metaDescription: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.canonical}
          aria-label="Canonical URL"
          placeholder="Canonical path"
          onChange={(event) => setForm({ ...form, canonical: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.ogImage}
          aria-label="OG image URL"
          placeholder="OG image URL"
          onChange={(event) => setForm({ ...form, ogImage: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.focusKeyword}
          aria-label="Focus keyword"
          placeholder="Focus keyword"
          onChange={(event) => setForm({ ...form, focusKeyword: event.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.noIndex}
            onChange={(event) => setForm({ ...form, noIndex: event.target.checked })}
          />
          Hide from search engines
        </label>
        <SeoHints
          title={form.metaTitle || form.name}
          description={form.metaDescription || form.description}
          h1={form.name}
          focusKeyword={form.focusKeyword}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />
          Active
        </label>
        <button className={buttonClass()} type="submit">
          Save category
        </button>
      </form>
    </div>
  );
}

export function BrandManager({
  rows,
  editing,
}: {
  rows: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    _count: { products: number };
  }[];
  editing: BrandFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <RecordTable
        rows={rows.map((row) => ({
          id: row.id,
          title: row.name,
          meta: row.slug,
          count: row._count.products,
          href: `/admin/brands?id=${row.id}`,
        }))}
        onDelete={(id) => {
          void deleteBrandAction(id).then((result) => {
            setMessage(result.message);
            if (result.ok) router.refresh();
          });
        }}
      />
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void saveBrandAction(form).then((result) => {
            setMessage(result.message);
            if (result.ok) {
              router.push("/admin/brands");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">{form.id ? "Edit brand" : "Add brand"}</h2>
        <Notice message={message} />
        <input
          className={fieldClass}
          value={form.name}
          aria-label="Name"
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              slug: slugTouched ? form.slug : slugify(event.target.value),
            })
          }
        />
        <input
          className={fieldClass}
          value={form.slug}
          aria-label="Slug"
          onChange={(event) => {
            setSlugTouched(true);
            setForm({ ...form, slug: event.target.value });
          }}
        />
        <textarea
          className={areaClass}
          value={form.description}
          aria-label="Description"
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.metaTitle}
          aria-label="Meta title"
          placeholder="Meta title"
          onChange={(event) => setForm({ ...form, metaTitle: event.target.value })}
        />
        <textarea
          className={areaClass}
          value={form.metaDescription}
          aria-label="Meta description"
          placeholder="Meta description"
          onChange={(event) => setForm({ ...form, metaDescription: event.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
          />{" "}
          Active
        </label>
        <button className={buttonClass()} type="submit">
          Save brand
        </button>
      </form>
    </div>
  );
}

export function UnitManager({
  rows,
  editing,
}: {
  rows: { id: string; name: string; shortName: string; _count: { products: number } }[];
  editing: UnitFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState(editing);
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <RecordTable
        rows={rows.map((row) => ({
          id: row.id,
          title: row.name,
          meta: row.shortName,
          count: row._count.products,
          href: `/admin/units?id=${row.id}`,
        }))}
        onDelete={(id) =>
          void deleteUnitAction(id).then((result) => {
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
      />
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void saveUnitAction(form).then((result) => {
            setMessage(result.message);
            if (result.ok) {
              router.push("/admin/units");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">{form.id ? "Edit unit" : "Add unit"}</h2>
        <Notice message={message} />
        <input
          className={fieldClass}
          value={form.name}
          aria-label="Name"
          placeholder="Piece"
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className={fieldClass}
          value={form.shortName}
          aria-label="Short name"
          placeholder="pcs"
          onChange={(event) => setForm({ ...form, shortName: event.target.value })}
        />
        <button className={buttonClass()} type="submit">
          Save unit
        </button>
      </form>
    </div>
  );
}

export function LabelManager({
  rows,
  editing,
}: {
  rows: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    _count: { products: number };
  }[];
  editing: LabelFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <RecordTable
        rows={rows.map((row) => ({
          id: row.id,
          title: row.name,
          meta: `${row.kind} · ${row.slug}`,
          count: row._count.products,
          href: `/admin/labels?id=${row.id}`,
        }))}
        onDelete={(id) =>
          void deleteLabelAction(id).then((result) => {
            setMessage(result.message);
            if (result.ok) router.refresh();
          })
        }
      />
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void saveLabelAction(form).then((result) => {
            setMessage(result.message);
            if (result.ok) {
              router.push("/admin/labels");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold">{form.id ? "Edit label" : "Add label"}</h2>
        <Notice message={message} />
        <input
          className={fieldClass}
          value={form.name}
          aria-label="Name"
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              slug: slugTouched ? form.slug : slugify(event.target.value),
            })
          }
        />
        <input
          className={fieldClass}
          value={form.slug}
          aria-label="Slug"
          onChange={(event) => {
            setSlugTouched(true);
            setForm({ ...form, slug: event.target.value });
          }}
        />
        <select
          className={fieldClass}
          value={form.kind}
          aria-label="Kind"
          onChange={(event) =>
            setForm({ ...form, kind: event.target.value as LabelFormValues["kind"] })
          }
        >
          <option value="NEW">New</option>
          <option value="HOT">Hot</option>
          <option value="SALE">Sale</option>
        </select>
        <button className={buttonClass()} type="submit">
          Save label
        </button>
      </form>
    </div>
  );
}

function RecordTable({
  rows,
  onDelete,
}: {
  rows: { id: string; title: string; meta: string; count: number; href: string }[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-black/5 text-muted">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Products</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="p-4 text-muted" colSpan={3}>
                Nothing here yet.
              </td>
            </tr>
          ) : null}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/5">
              <td className="p-3">
                <p className="font-semibold">{row.title}</p>
                <p className="text-xs text-muted">{row.meta}</p>
              </td>
              <td className="p-3">{row.count}</td>
              <td className="p-3">
                <Link href={row.href} className="font-semibold text-primary">
                  Edit
                </Link>
                <button
                  type="button"
                  className="ml-3 font-semibold"
                  onClick={() => onDelete(row.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
  const [form, setForm] = useState(editing);
  const [slugTouched, setSlugTouched] = useState(editing.id !== "");
  const [message, setMessage] = useState("");
  const [valueForm, setValueForm] = useState<AttributeValueFormValues>({
    id: "",
    attributeId: editing.id,
    label: "",
    swatch: "",
    sortOrder: "0",
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {rows.map((row) => (
          <section key={row.id} className="rounded-lg bg-card p-4 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold">{row.name}</h2>
                <p className="text-xs text-muted">
                  {row.style === "SWATCH" ? "Color swatch" : "Button"} ·{" "}
                  {row._count.products} products
                </p>
              </div>
              <div>
                <Link
                  href={`/admin/attributes?id=${row.id}`}
                  className="font-semibold text-primary"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="ml-3 text-sm font-semibold"
                  onClick={() =>
                    void deleteAttributeAction(row.id).then((result) => {
                      setMessage(result.message);
                      if (result.ok) router.refresh();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {row.values.map((value) => (
                <li
                  key={value.id}
                  className="flex items-center gap-2 rounded-md border border-black/10 px-2 py-1 text-sm"
                >
                  {value.swatch ? (
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-black/10"
                      style={{ background: value.swatch }}
                    />
                  ) : null}
                  {value.label}
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary"
                    onClick={() =>
                      void deleteAttributeValueAction(value.id).then((result) => {
                        setMessage(result.message);
                        if (result.ok) router.refresh();
                      })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Notice message={message} />
      </div>
      <div className="space-y-4">
        <form
          className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            void saveAttributeAction(form).then((result) => {
              setMessage(result.message);
              if (result.ok && result.id)
                router.push(`/admin/attributes?id=${result.id}`);
            });
          }}
        >
          <h2 className="font-semibold">
            {form.id ? "Edit attribute" : "Add attribute"}
          </h2>
          <input
            className={fieldClass}
            value={form.name}
            aria-label="Name"
            onChange={(event) =>
              setForm({
                ...form,
                name: event.target.value,
                slug: slugTouched ? form.slug : slugify(event.target.value),
              })
            }
          />
          <input
            className={fieldClass}
            value={form.slug}
            aria-label="Slug"
            onChange={(event) => {
              setSlugTouched(true);
              setForm({ ...form, slug: event.target.value });
            }}
          />
          <select
            className={fieldClass}
            value={form.style}
            aria-label="Style"
            onChange={(event) =>
              setForm({
                ...form,
                style: event.target.value as AttributeFormValues["style"],
              })
            }
          >
            <option value="BUTTON">Button / label</option>
            <option value="SWATCH">Color swatch</option>
          </select>
          <button className={buttonClass()} type="submit">
            Save attribute
          </button>
        </form>
        {form.id ? (
          <form
            className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAttributeValueAction({ ...valueForm, attributeId: form.id }).then(
                (result) => {
                  setMessage(result.message);
                  if (result.ok) {
                    setValueForm({ ...valueForm, label: "", swatch: "" });
                    router.refresh();
                  }
                },
              );
            }}
          >
            <h2 className="font-semibold">Add value</h2>
            <input
              className={fieldClass}
              value={valueForm.label}
              aria-label="Value"
              placeholder="Red"
              onChange={(event) =>
                setValueForm({ ...valueForm, label: event.target.value })
              }
            />
            <input
              className={fieldClass}
              value={valueForm.swatch}
              aria-label="Swatch"
              placeholder="#F95B09"
              onChange={(event) =>
                setValueForm({ ...valueForm, swatch: event.target.value })
              }
            />
            <input
              className={fieldClass}
              value={valueForm.sortOrder}
              aria-label="Sort order"
              onChange={(event) =>
                setValueForm({ ...valueForm, sortOrder: event.target.value })
              }
            />
            <button className={buttonClass("outline")} type="submit">
              Save value
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

export function TagManager({ tags }: { tags: { tag: string; count: number }[] }) {
  const router = useRouter();
  const [from, setFrom] = useState(tags[0]?.tag ?? "");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <ul className="rounded-lg bg-card shadow-soft">
        {tags.length === 0 ? (
          <li className="p-4 text-sm text-muted">No tags yet. Add them on a product.</li>
        ) : null}
        {tags.map((tag) => (
          <li
            key={tag.tag}
            className="flex items-center justify-between border-b border-black/5 px-4 py-3 text-sm"
          >
            <span>
              {tag.tag} · {tag.count}
            </span>
            <button
              type="button"
              className="font-semibold text-primary"
              onClick={() =>
                void removeTagAction(tag.tag).then((result) => {
                  setMessage(result.message);
                  if (result.ok) router.refresh();
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void renameTagAction(from, to).then((result) => {
            setMessage(result.message);
            if (result.ok) router.refresh();
          });
        }}
      >
        <h2 className="font-semibold">Rename a tag</h2>
        <Notice message={message} />
        <select
          className={fieldClass}
          value={from}
          aria-label="Tag"
          onChange={(event) => setFrom(event.target.value)}
        >
          {tags.map((tag) => (
            <option key={tag.tag} value={tag.tag}>
              {tag.tag}
            </option>
          ))}
        </select>
        <input
          className={fieldClass}
          value={to}
          aria-label="New tag"
          placeholder="New name"
          onChange={(event) => setTo(event.target.value)}
        />
        <button className={buttonClass()} type="submit">
          Rename
        </button>
      </form>
    </div>
  );
}

export function ReviewList({
  reviews,
  status,
}: {
  status: string;
  reviews: {
    id: string;
    authorName: string;
    rating: number;
    comment: string;
    status: string;
    product: { name: string };
  }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [csv, setCsv] = useState("slug,author,rating,comment\n");
  return (
    <div className="space-y-4">
      <form className="flex gap-2" action="/admin/reviews">
        <select
          className={fieldClass}
          name="status"
          defaultValue={status}
          aria-label="Review status"
        >
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button className={buttonClass("ink")} type="submit">
          Filter
        </button>
      </form>
      <form
        className="space-y-2 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          void importReviewsAction(csv).then((result) => {
            setMessage(result.message);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold text-ink">Import UGC reviews</h2>
        <p className="text-sm text-muted">
          Paste CSV with slug, author, rating, and comment. Imported reviews are approved.
        </p>
        <textarea
          className={areaClass}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          aria-label="Review CSV"
        />
        <button className={buttonClass()} type="submit">
          Import CSV
        </button>
      </form>
      <Notice message={message} />
      {reviews.map((review) => (
        <article key={review.id} className="rounded-lg bg-card p-4 shadow-soft">
          <p className="text-sm font-semibold">{review.product.name}</p>
          <p className="text-sm text-muted">
            {review.authorName} · {review.rating}/5 · {review.status}
          </p>
          <p className="mt-2 text-sm">{review.comment}</p>
          <div className="mt-3 flex gap-2">
            <button
              className={buttonClass()}
              type="button"
              onClick={() =>
                void moderateReviewAction(review.id, "APPROVED").then((result) => {
                  setMessage(result.message);
                  if (result.ok) router.refresh();
                })
              }
            >
              Approve
            </button>
            <button
              className={buttonClass("outline")}
              type="button"
              onClick={() =>
                void moderateReviewAction(review.id, "REJECTED").then((result) => {
                  setMessage(result.message);
                  if (result.ok) router.refresh();
                })
              }
            >
              Reject
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

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
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <div className="space-y-4">
      <Notice message={message} />
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          onMessage={(text, refresh) => {
            setMessage(text);
            if (refresh) router.refresh();
          }}
        />
      ))}
    </div>
  );
}

function QuestionCard({
  question,
  onMessage,
}: {
  question: {
    id: string;
    authorName: string;
    question: string;
    answer: string | null;
    product: { name: string };
  };
  onMessage: (message: string, refresh: boolean) => void;
}) {
  const [answer, setAnswer] = useState(question.answer ?? "");
  return (
    <article className="rounded-lg bg-card p-4 shadow-soft">
      <p className="text-sm font-semibold">{question.product.name}</p>
      <p className="text-sm text-muted">{question.authorName}</p>
      <p className="mt-2 text-sm">{question.question}</p>
      <textarea
        className={`${areaClass} mt-3`}
        value={answer}
        aria-label="Answer"
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <button
          className={buttonClass()}
          type="button"
          onClick={() =>
            void answerQuestionAction(question.id, answer).then((result) =>
              onMessage(result.message, result.ok),
            )
          }
        >
          Save answer
        </button>
        <button
          className={buttonClass("outline")}
          type="button"
          onClick={() =>
            void deleteQuestionAction(question.id).then((result) =>
              onMessage(result.message, result.ok),
            )
          }
        >
          Delete
        </button>
      </div>
    </article>
  );
}
