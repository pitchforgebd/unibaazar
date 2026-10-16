"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/admin/result";

export function DeleteButton({
  action,
  label = "Delete",
  confirmText = "Delete this item?",
}: {
  action: () => Promise<ActionResult>;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="text-xs font-semibold text-red-700 disabled:opacity-50"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) {
          return;
        }
        setPending(true);
        void action().then((result) => {
          setPending(false);
          if (result.ok) {
            router.refresh();
          } else {
            window.alert(result.message);
          }
        });
      }}
    >
      {pending ? "Removing…" : label}
    </button>
  );
}
