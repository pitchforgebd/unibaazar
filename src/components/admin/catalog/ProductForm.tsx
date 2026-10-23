"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteProductAction,
  saveProductAction,
} from "@/app/(admin)/admin/catalog-actions";
import { ProductBasicsFields } from "@/components/admin/catalog/ProductBasicsFields";
import { ProductDescriptionFields } from "@/components/admin/catalog/ProductDescriptionFields";
import { ProductGallerySection } from "@/components/admin/catalog/ProductGallerySection";
import { ProductPricingFields } from "@/components/admin/catalog/ProductPricingFields";
import { ProductSeoSection } from "@/components/admin/catalog/ProductSeoSection";
import { ProductVariantsSection } from "@/components/admin/catalog/ProductVariantsSection";
import { slugify } from "@/components/admin/catalog/slugify";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { useToastStore } from "@/store/toast";
import type { ProductFormValues } from "@/lib/validation/admin-catalog";
import type { CatalogOptions } from "@/server/admin/products";

export function ProductForm({
  initial,
  options,
}: {
  initial: ProductFormValues;
  options: CatalogOptions;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [form, setForm] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(initial.id !== "");
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function patch(partial: Partial<ProductFormValues>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        const first = form.variants[0];
        const payload: ProductFormValues = {
          ...form,
          basePrice:
            form.type === "SIMPLE" && first
              ? first.price || form.basePrice
              : form.basePrice,
          variants:
            form.type === "SIMPLE" && first
              ? [
                  {
                    ...first,
                    valueIds: [],
                    isDefault: true,
                    price: first.price || form.basePrice,
                  },
                ]
              : form.variants,
        };
        void saveProductAction(payload).then((result) => {
          setPending(false);
          push({ message: result.message, type: result.ok ? "success" : "error" });
          if (!result.ok || !result.id) {
            return;
          }
          if (!form.id) {
            router.push(`/admin/products/${result.id}`);
            return;
          }
          router.refresh();
        });
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          {form.id ? "Edit product" : "Add product"}
        </h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className={buttonStyles({ variant: "outline" })}>
            All products
          </Link>
          <Button type="submit" isLoading={pending} loadingLabel="Saving…">
            Save product
          </Button>
        </div>
      </div>
      <ProductBasicsFields
        form={form}
        options={options}
        patch={patch}
        onNameChange={(name) =>
          patch({ name, slug: slugTouched ? form.slug : slugify(name) })
        }
        onSlugChange={(slug) => {
          setSlugTouched(true);
          patch({ slug });
        }}
      />
      <ProductDescriptionFields form={form} patch={patch} />
      <ProductPricingFields form={form} patch={patch} />
      <ProductGallerySection form={form} patch={patch} />
      <ProductVariantsSection form={form} options={options} patch={patch} />
      <ProductSeoSection form={form} patch={patch} />
      {form.id ? (
        <>
          <Button variant="outline" type="button" onClick={() => setDeleteOpen(true)}>
            Delete product
          </Button>
          <AlertDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Delete product"
            description={`Delete "${form.name}"? This can't be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            isLoading={deleting}
            loadingLabel="Deleting…"
            onConfirm={() => {
              setDeleting(true);
              void deleteProductAction(form.id).then((result) => {
                setDeleting(false);
                if (result.ok) {
                  setDeleteOpen(false);
                  router.push("/admin/products");
                  return;
                }
                push({ message: result.message, type: "error" });
              });
            }}
          />
        </>
      ) : null}
    </form>
  );
}
