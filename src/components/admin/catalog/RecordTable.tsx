"use client";

import Link from "next/link";
import { DeleteButton } from "@/components/admin/common/DeleteButton";
import type { ActionResult } from "@/server/admin/result";

export type RecordTableRow = {
  id: string;
  title: string;
  meta: string;
  count: number;
  href: string;
};

/** The shared name/meta/product-count table used by brands, units, and labels. */
export function RecordTable({
  rows,
  countLabel = "Products",
  onDelete,
}: {
  rows: RecordTableRow[];
  countLabel?: string;
  onDelete: (id: string) => Promise<ActionResult>;
}) {
  return (
    <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-black/5 text-muted">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">{countLabel}</th>
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
                <p className="font-semibold text-ink">{row.title}</p>
                <p className="text-xs text-muted">{row.meta}</p>
              </td>
              <td className="p-3">{row.count}</td>
              <td className="p-3">
                <div className="flex items-center gap-3">
                  <Link href={row.href} className="text-xs font-semibold text-primary">
                    Edit
                  </Link>
                  <DeleteButton
                    action={() => onDelete(row.id)}
                    confirmText={`Delete "${row.title}"? This can't be undone.`}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
