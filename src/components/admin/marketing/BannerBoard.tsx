"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bannerAction, deleteBannerAction } from "@/app/(admin)/admin/marketing-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import { uploadAdminImageUrl } from "@/components/admin/common/uploadAdminImage";

type BannerRow = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  placement: string;
  sortOrder: number;
  isActive: boolean;
};

const blankBannerForm = {
  id: "",
  title: "",
  subtitle: "",
  href: "/",
  imageUrl: "",
  placement: "home",
  sortOrder: "0",
  isActive: true,
};

export function BannerBoard({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [bannerForm, setBannerForm] = useState(blankBannerForm);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  function editBanner(row: BannerRow) {
    setBannerForm({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      href: row.href,
      imageUrl: row.imageUrl,
      placement: row.placement,
      sortOrder: String(row.sortOrder),
      isActive: row.isActive,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Banners</h1>
        <p className="text-sm text-muted">
          Popup and exit placements are the popup and exit-intent offers. Active banners
          inside their dates are returned by the public banners API.
        </p>
      </div>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Image</th>
              <th className="px-3 py-3 font-semibold">Title</th>
              <th className="px-3 py-3 font-semibold">Place</th>
              <th className="px-3 py-3 font-semibold">Link</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.map((row) => (
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
                <td className="px-3 py-3">{row.placement}</td>
                <td className="px-3 py-3">{row.href}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary"
                      onClick={() => editBanner(row)}
                    >
                      Edit
                    </button>
                    <DeleteButton
                      action={() => deleteBannerAction({ id: row.id })}
                      confirmText={`Delete banner ${row.title}?`}
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
          void bannerAction(bannerForm).then((result) => {
            push({ message: result.message, type: result.ok ? "success" : "error" });
            setPending(false);
            if (result.ok) {
              setBannerForm(blankBannerForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-heading font-semibold text-ink">
            {bannerForm.id ? "Edit banner" : "New banner"}
          </h2>
          {bannerForm.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => setBannerForm(blankBannerForm)}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <Input
          label="Title"
          value={bannerForm.title}
          onChange={(event) =>
            setBannerForm({ ...bannerForm, title: event.target.value })
          }
        />
        <Input
          label="Subtitle"
          value={bannerForm.subtitle}
          onChange={(event) =>
            setBannerForm({ ...bannerForm, subtitle: event.target.value })
          }
        />
        <Input
          label="Link"
          value={bannerForm.href}
          onChange={(event) => setBannerForm({ ...bannerForm, href: event.target.value })}
        />
        <Select
          label="Placement"
          value={bannerForm.placement}
          onChange={(event) =>
            setBannerForm({ ...bannerForm, placement: event.target.value })
          }
        >
          <option value="home">Home</option>
          <option value="category">Category</option>
          <option value="popup">Popup</option>
          <option value="exit">Exit intent</option>
        </Select>
        <Input
          label="Sort"
          value={bannerForm.sortOrder}
          onChange={(event) =>
            setBannerForm({ ...bannerForm, sortOrder: event.target.value })
          }
        />
        <Checkbox
          label="Active"
          checked={bannerForm.isActive}
          onChange={(event) =>
            setBannerForm({ ...bannerForm, isActive: event.target.checked })
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
              void uploadAdminImageUrl(file).then((url) => {
                setUploading(false);
                if (url) {
                  setBannerForm((current) => ({ ...current, imageUrl: url }));
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
          {bannerForm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerForm.imageUrl}
              alt=""
              className="mt-2 h-16 w-28 rounded-theme object-cover"
            />
          ) : null}
        </div>
        <div className="flex items-end">
          <Button type="submit" isLoading={pending || uploading}>
            {bannerForm.id ? "Save changes" : "Save banner"}
          </Button>
        </div>
      </form>
    </div>
  );
}
