"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { bulkProductsAction } from "@/app/(admin)/admin/catalog-actions";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";

export function ProductBulkBar({
  selected,
  categories,
  onDone,
}: {
  selected: string[];
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [action, setAction] = useState("publish");
  const [priceMode, setPriceMode] = useState<"set" | "percent" | "amount">("percent");
  const [priceValue, setPriceValue] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [categoryMode, setCategoryMode] = useState<"add" | "replace">("add");

  async function runBulk() {
    if (selected.length === 0) {
      push({ message: "Select at least one product.", type: "error" });
      return;
    }
    setPending(true);
    const payload =
      action === "price"
        ? { action, ids: selected, mode: priceMode, value: Number(priceValue) }
        : action === "category"
          ? { action, ids: selected, categoryId, mode: categoryMode }
          : { action, ids: selected };
    const result = await bulkProductsAction(payload);
    setPending(false);
    setConfirmOpen(false);
    push({ message: result.message, type: result.ok ? "success" : "error" });
    if (result.ok) {
      onDone();
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-theme bg-card p-4 shadow-soft">
      <Select
        label="Bulk action"
        value={action}
        onChange={(event) => setAction(event.target.value)}
      >
        <option value="publish">Publish</option>
        <option value="delete">Delete</option>
        <option value="price">Update price</option>
        <option value="category">Change category</option>
      </Select>
      {action === "price" ? (
        <>
          <Select
            label="Price change"
            hideLabel
            value={priceMode}
            onChange={(event) =>
              setPriceMode(event.target.value as "set" | "percent" | "amount")
            }
          >
            <option value="percent">Percent</option>
            <option value="amount">Add amount</option>
            <option value="set">Set price</option>
          </Select>
          <Input
            label="Price value"
            hideLabel
            value={priceValue}
            onChange={(event) => setPriceValue(event.target.value)}
            inputMode="decimal"
            placeholder="-10 or 100"
          />
        </>
      ) : null}
      {action === "category" ? (
        <>
          <Select
            label="Bulk category"
            hideLabel
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            label="Category mode"
            hideLabel
            value={categoryMode}
            onChange={(event) => setCategoryMode(event.target.value as "add" | "replace")}
          >
            <option value="add">Add</option>
            <option value="replace">Replace</option>
          </Select>
        </>
      ) : null}
      <Button
        variant="outline"
        isLoading={pending && action !== "delete"}
        onClick={() => {
          if (action === "delete") {
            setConfirmOpen(true);
            return;
          }
          void runBulk();
        }}
      >
        Apply
      </Button>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete products"
        description={`Delete ${selected.length} selected ${selected.length === 1 ? "product" : "products"}? This can't be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Deleting…"
        onConfirm={() => void runBulk()}
      />
    </div>
  );
}
