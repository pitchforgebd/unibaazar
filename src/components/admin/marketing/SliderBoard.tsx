"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSliderAction, sliderAction } from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import { uploadMarketingImage } from "./imageUpload";

type SliderRow = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

const blankSliderForm = {
  id: "",
  title: "",
  subtitle: "",
  href: "/",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};

export function SliderBoard({ sliders }: { sliders: SliderRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [sliderForm, setSliderForm] = useState(blankSliderForm);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  function editSlider(row: SliderRow) {
    setSliderForm({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      href: row.href,
      imageUrl: row.imageUrl,
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Home sliders</h1>
        <p className="text-sm text-muted">The homepage hero slideshow, in sort order.</p>
      </div>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[480px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Image</th>
              <th className="px-3 py-3 font-semibold">Slide</th>
              <th className="px-3 py-3 font-semibold">Link</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sliders.map((row) => (
              <tr key={row.id} className="border-b border-ink/10 last:border-0">
                <td className="px-3 py-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.imageUrl}
                      alt=""
                      className="h-10 w-16 rounded-theme object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted">No image</span>
                  )}
                </td>
                <td className="px-3 py-3 font-semibold text-ink">{row.title}</td>
                <td className="px-3 py-3">{row.href}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary"
                      onClick={() => editSlider(row)}
                    >
                      Edit
                    </button>
                    <DeleteButton
                      action={() => deleteSliderAction({ id: row.id })}
                      confirmText={`Delete slide ${row.title}?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void sliderAction(sliderForm).then((result) => {
            push({ message: result.message, type: result.ok ? "success" : "error" });
            setPending(false);
            if (result.ok) {
              setSliderForm(blankSliderForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-heading font-semibold text-ink">
            {sliderForm.id ? "Edit slide" : "New slide"}
          </h2>
          {sliderForm.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => setSliderForm(blankSliderForm)}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <Input
          label="Title"
          value={sliderForm.title}
          onChange={(event) =>
            setSliderForm({ ...sliderForm, title: event.target.value })
          }
        />
        <Input
          label="Link"
          value={sliderForm.href}
          onChange={(event) => setSliderForm({ ...sliderForm, href: event.target.value })}
        />
        <Checkbox
          label="Active"
          checked={sliderForm.isActive}
          onChange={(event) =>
            setSliderForm({ ...sliderForm, isActive: event.target.checked })
          }
        />
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Image
          </label>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              setUploading(true);
              void uploadMarketingImage(file).then((url) => {
                setUploading(false);
                if (url) {
                  setSliderForm((current) => ({ ...current, imageUrl: url }));
                } else {
                  push({ message: "Upload failed", type: "error" });
                }
              });
            }}
            className="block w-full text-sm text-foreground"
          />
          {uploading ? (
            <span className="mt-1 block text-xs text-muted">Uploading…</span>
          ) : null}
          {sliderForm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sliderForm.imageUrl}
              alt=""
              className="mt-2 h-16 w-28 rounded-theme object-cover"
            />
          ) : null}
        </div>
        <div>
          <Button type="submit" variant="outline" isLoading={pending || uploading}>
            {sliderForm.id ? "Save changes" : "Save slide"}
          </Button>
        </div>
      </form>
    </div>
  );
}
