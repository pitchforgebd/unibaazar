"use client";

import { useState } from "react";
import { quickEditAction } from "@/app/(admin)/admin/catalog-actions";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { AdminProductRow } from "@/server/admin/products";

export function ProductQuickEdit({
  row,
  onClose,
  onDone,
}: {
  row: AdminProductRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [status, setStatus] = useState(row.status);
  const [price, setPrice] = useState(String(row.price));
  const [stock, setStock] = useState(String(row.stock));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void quickEditAction({ id: row.id, name, status, price, stock }).then(
          (result) => {
            setPending(false);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            onDone(result.message);
          },
        );
      }}
    >
      <Input
        label="Name"
        hideLabel
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Select
        label="Status"
        hideLabel
        value={status}
        onChange={(event) => setStatus(event.target.value as AdminProductRow["status"])}
      >
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Published</option>
        <option value="SCHEDULED">Scheduled</option>
      </Select>
      <Input
        label="Price"
        hideLabel
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        inputMode="decimal"
      />
      <Input
        label="Stock"
        hideLabel
        value={stock}
        onChange={(event) => setStock(event.target.value)}
        inputMode="numeric"
      />
      {error ? <FieldError>{error}</FieldError> : null}
      <div className="flex gap-2">
        <Button type="submit" isLoading={pending}>
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
