"use client";

import { useState } from "react";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import { Tabs } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToastStore } from "@/store/toast";

export function OverlaysSection({ presetId }: { presetId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const push = useToastStore((state) => state.push);

  function confirmDelete() {
    setAlertLoading(true);
    setTimeout(() => {
      setAlertLoading(false);
      setAlertOpen(false);
      push(`(${presetId}) Deleted.`);
    }, 1200);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Overlays &amp; feedback
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button variant="destructive" onClick={() => setAlertOpen(true)}>
            Delete item
          </Button>
          <Button variant="outline" onClick={() => setSheetOpen(true)}>
            Open filter sheet
          </Button>
          <Tooltip content="A tooltip, shown on hover or focus">
            <Button variant="ghost">Hover me</Button>
          </Tooltip>
          <Button variant="outline" onClick={() => push(`(${presetId}) Added to cart.`)}>
            Push a toast
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Tabs</h3>
        <Tabs
          label="Product information"
          className="mt-2"
          items={[
            {
              value: "description",
              label: "Description",
              content: (
                <p className="text-sm text-foreground">
                  A cotton crew-neck t-shirt in five colours.
                </p>
              ),
            },
            {
              value: "reviews",
              label: "Reviews",
              content: (
                <p className="text-sm text-foreground">4.6 out of 5, from 128 reviews.</p>
              ),
            },
            {
              value: "qa",
              label: "Q&A",
              content: (
                <p className="text-sm text-foreground">
                  No questions yet — ask the first one.
                </p>
              ),
            },
          ]}
        />
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add a note to this order"
        description="Visible to the customer on their order timeline."
        closeLabel="Close dialog"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Save note</Button>
          </>
        }
      >
        <p className="text-sm text-foreground">
          This dialog traps focus, closes on Escape or a backdrop click, and returns focus
          to the button that opened it.
        </p>
      </Dialog>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete this product?"
        description="This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        isLoading={alertLoading}
        loadingLabel="Deleting"
        variant="destructive"
      />

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        side="bottom"
        title="Filter"
        closeLabel="Close filters"
        footer={<Button onClick={() => setSheetOpen(false)}>Apply</Button>}
      >
        <p className="text-sm text-foreground">
          The mobile filter sheet pattern from the master plan&apos;s §4.3.
        </p>
      </Sheet>
    </div>
  );
}
