"use client";

import { useState } from "react";
import { GripVertical, ImageUp, Star, Trash2, UploadCloud } from "lucide-react";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";

export function ProductGallerySection({
  form,
  patch,
}: {
  form: ProductFormValues;
  patch: (partial: Partial<ProductFormValues>) => void;
}) {
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setPending(true);
    for (const file of files) {
      const body = new FormData();
      body.set("file", file);
      const result = await uploadCatalogImageAction(body);
      if (!result.ok || !result.url) {
        push({ message: result.message, type: "error" });
        setPending(false);
        return;
      }
      patch({
        images: [...form.images, { id: "", url: result.url, alt: "" }].slice(0, 12),
      });
    }
    setPending(false);
  }

  function moveImage(from: number, to: number) {
    if (from === to || from < 0 || to < 0) {
      return;
    }
    const images = [...form.images];
    const [item] = images.splice(from, 1);
    if (!item) {
      return;
    }
    images.splice(to, 0, item);
    patch({ images });
  }

  return (
    <section className="space-y-3 rounded-theme bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-ink">Gallery</h2>
          <p className="text-xs text-muted">
            Up to 12 photos. The first image is the primary listing photo — drag the grip
            handle to reorder.
          </p>
        </div>
        <span className="rounded-full bg-page px-2.5 py-1 text-xs font-semibold text-muted">
          {form.images.length} / 12
        </span>
      </div>
      <label
        className="flex cursor-pointer flex-col items-center gap-2 rounded-theme border-2 border-dashed border-black/15 bg-page/40 px-4 py-6 text-center transition-colors hover:border-primary hover:bg-page/70"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (event.dataTransfer.files.length > 0) {
            event.preventDefault();
            void onUpload(event.dataTransfer.files);
          }
        }}
      >
        <UploadCloud className="text-muted" size={28} />
        <span className="text-sm font-semibold text-ink">
          {pending ? "Uploading…" : "Drag & drop photos, or click to browse"}
        </span>
        <span className="text-xs text-muted">
          PNG, JPEG, WEBP or GIF — multiple files OK
        </span>
        <input
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          disabled={pending}
          onChange={(event) => void onUpload(event.target.files)}
        />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label="Image URL"
          hideLabel
          containerClassName="flex-1"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="Or paste an image URL: https://..."
        />
        <Button
          variant="outline"
          onClick={() => {
            if (!imageUrl.trim()) {
              return;
            }
            patch({
              images: [...form.images, { id: "", url: imageUrl.trim(), alt: "" }].slice(
                0,
                12,
              ),
            });
            setImageUrl("");
          }}
        >
          <ImageUp size={15} />
          Add URL
        </Button>
      </div>
      {form.images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {form.images.map((image, index) => (
            <li
              key={`${image.id}-${index}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.dataTransfer.files.length > 0) {
                  void onUpload(event.dataTransfer.files);
                  return;
                }
                if (dragIndex !== null) {
                  moveImage(dragIndex, index);
                }
                setDragIndex(null);
              }}
              className={`group relative overflow-hidden rounded-theme border p-2 transition-colors ${dragIndex === index ? "border-primary bg-page/60" : "border-black/10 bg-page/20"}`}
            >
              {index === 0 ? (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Star size={11} className="fill-white" /> Primary
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <span
                  className="cursor-grab touch-none text-muted/70 active:cursor-grabbing"
                  aria-hidden
                >
                  <GripVertical size={16} />
                </span>
                {/* Gallery previews use stored URLs, including files uploaded at runtime. */}
                <div
                  className="h-24 w-full rounded-theme bg-card bg-cover bg-center"
                  style={{
                    backgroundImage: `url("${image.url.replace(/["\\]/g, "")}")`,
                  }}
                  role="img"
                  aria-label={image.alt || "Gallery image"}
                />
              </div>
              <Input
                label={`Alt text ${index + 1}`}
                hideLabel
                containerClassName="mt-2"
                className="h-9"
                value={image.alt}
                placeholder="Alt text (for SEO & accessibility)"
                onChange={(event) => {
                  const images = form.images.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, alt: event.target.value } : item,
                  );
                  patch({ images });
                }}
              />
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs font-semibold text-ink/60 hover:text-primary disabled:opacity-30"
                  onClick={() => moveImage(index, index - 1)}
                  disabled={index === 0}
                >
                  ← Move earlier
                </button>
                <IconButton
                  aria-label="Remove image"
                  className="text-red-500/80 hover:bg-red-500/10 hover:text-red-600"
                  onClick={() =>
                    patch({
                      images: form.images.filter((_, itemIndex) => itemIndex !== index),
                    })
                  }
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-theme border border-dashed border-black/10 p-4 text-center text-xs text-muted">
          No photos yet — a professional listing needs at least one.
        </p>
      )}
    </section>
  );
}
