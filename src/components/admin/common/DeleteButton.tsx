"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { useToastStore } from "@/store/toast";
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
  const push = useToastStore((state) => state.push);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button
        type="button"
        className="text-xs font-semibold text-red-700 hover:underline"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description={confirmText}
        confirmLabel={label}
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Removing…"
        onConfirm={() => {
          setPending(true);
          void action().then((result) => {
            setPending(false);
            if (result.ok) {
              setOpen(false);
              router.refresh();
            } else {
              push({ message: result.message, type: "error" });
            }
          });
        }}
      />
    </>
  );
}
