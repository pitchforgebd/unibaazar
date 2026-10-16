"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  bannerAction,
  deleteBannerAction,
  deleteSliderAction,
  sliderAction,
} from "@/app/(admin)/admin/marketing-actions";
import { uploadCatalogImageAction } from "@/app/(admin)/admin/catalog-actions";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import { buttonClass, fieldClass } from "@/components/ui/controls";

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
type SliderRow = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
};

async function uploadOne(file: File): Promise<string | null> {
  const body = new FormData();
  body.set("file", file);
  const result = await uploadCatalogImageAction(body);
  return result.ok && result.url ? result.url : null;
}

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

const blankSliderForm = {
  id: "",
  title: "",
  subtitle: "",
  href: "/",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
};

export function BannerBoard({
  banners,
  sliders,
}: {
  banners: BannerRow[];
  sliders: SliderRow[];
}) {
  const router = useRouter();
  const [bannerForm, setBannerForm] = useState(blankBannerForm);
  const [sliderForm, setSliderForm] = useState(blankSliderForm);
  const [message, setMessage] = useState("");
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
    setMessage("");
  }

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
    setMessage("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Banners and sliders</h1>
        <p className="text-sm text-muted">
          Popup and exit placements are the popup and exit-intent offers. Active banners
          inside their dates are returned by the public banners API.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
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
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.imageUrl}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
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
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void bannerAction(bannerForm).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setBannerForm(blankBannerForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-semibold text-ink">
            {bannerForm.id ? "Edit banner" : "New banner"}
          </h2>
          {bannerForm.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => {
                setBannerForm(blankBannerForm);
                setMessage("");
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Title</span>
          <input
            value={bannerForm.title}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, title: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Subtitle</span>
          <input
            value={bannerForm.subtitle}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, subtitle: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Link</span>
          <input
            value={bannerForm.href}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, href: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Placement</span>
          <select
            value={bannerForm.placement}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, placement: event.target.value })
            }
            className={fieldClass}
          >
            <option value="home">Home</option>
            <option value="category">Category</option>
            <option value="popup">Popup</option>
            <option value="exit">Exit intent</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Sort</span>
          <input
            value={bannerForm.sortOrder}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, sortOrder: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={bannerForm.isActive}
            onChange={(event) =>
              setBannerForm({ ...bannerForm, isActive: event.target.checked })
            }
          />
          Active
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Image</span>
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
              void uploadOne(file).then((url) => {
                setUploading(false);
                if (url) {
                  setBannerForm((current) => ({ ...current, imageUrl: url }));
                }
              });
            }}
            className={fieldClass}
          />
          {uploading ? (
            <span className="mt-1 block text-xs text-muted">Uploading…</span>
          ) : null}
          {bannerForm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerForm.imageUrl}
              alt=""
              className="mt-2 h-16 w-28 rounded object-cover"
            />
          ) : null}
        </label>
        <div className="flex items-end">
          <button type="submit" className={buttonClass()} disabled={pending || uploading}>
            {bannerForm.id ? "Save changes" : "Save banner"}
          </button>
        </div>
      </form>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[480px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Image</th>
              <th className="px-3 py-3 font-semibold">Slide</th>
              <th className="px-3 py-3 font-semibold">Link</th>
              <th className="px-3 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sliders.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">
                  {row.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.imageUrl}
                      alt=""
                      className="h-10 w-16 rounded object-cover"
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
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void sliderAction(sliderForm).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              setSliderForm(blankSliderForm);
              router.refresh();
            }
          });
        }}
      >
        <div className="flex items-center justify-between sm:col-span-2">
          <h2 className="font-semibold text-ink">
            {sliderForm.id ? "Edit slide" : "New slide"}
          </h2>
          {sliderForm.id ? (
            <button
              type="button"
              className="text-xs font-semibold text-muted hover:text-primary"
              onClick={() => {
                setSliderForm(blankSliderForm);
                setMessage("");
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Title</span>
          <input
            value={sliderForm.title}
            onChange={(event) =>
              setSliderForm({ ...sliderForm, title: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Link</span>
          <input
            value={sliderForm.href}
            onChange={(event) =>
              setSliderForm({ ...sliderForm, href: event.target.value })
            }
            className={fieldClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={sliderForm.isActive}
            onChange={(event) =>
              setSliderForm({ ...sliderForm, isActive: event.target.checked })
            }
          />
          Active
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-semibold text-ink">Image</span>
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
              void uploadOne(file).then((url) => {
                setUploading(false);
                if (url) {
                  setSliderForm((current) => ({ ...current, imageUrl: url }));
                }
              });
            }}
            className={fieldClass}
          />
          {uploading ? (
            <span className="mt-1 block text-xs text-muted">Uploading…</span>
          ) : null}
          {sliderForm.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sliderForm.imageUrl}
              alt=""
              className="mt-2 h-16 w-28 rounded object-cover"
            />
          ) : null}
        </label>
        <div>
          <button
            type="submit"
            className={buttonClass("outline")}
            disabled={pending || uploading}
          >
            {sliderForm.id ? "Save changes" : "Save slide"}
          </button>
        </div>
        {message ? <p className="text-sm text-ink sm:col-span-2">{message}</p> : null}
      </form>
    </div>
  );
}
