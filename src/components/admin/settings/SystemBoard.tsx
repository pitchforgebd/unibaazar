"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  backupAction,
  cacheAction,
  restoreAction,
  systemAction,
} from "@/app/(admin)/admin/settings-actions";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { SystemSettings } from "@/server/settings/store";

export function SystemBoard({
  values,
  backups,
}: {
  values: SystemSettings;
  backups: string[];
}) {
  const router = useRouter();
  const [file, setFile] = useState(backups[0] ?? "");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  return (
    <SettingsForm
      title="System"
      intro="Maintenance hides the store from shoppers. Staff can still open the site and the admin."
      initial={{ ...values }}
      save={systemAction}
      fields={[
        { name: "maintenance", label: "Maintenance mode", kind: "checkbox" },
        { name: "cookieText", label: "Cookie banner text", kind: "textarea" },
        { name: "headerScript", label: "Header script", kind: "textarea" },
        { name: "footerScript", label: "Footer script", kind: "textarea" },
      ]}
      extra={
        <div className="space-y-3 rounded-theme bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Backup and cache</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              isLoading={pending}
              loadingLabel="Exporting…"
              onClick={() => {
                setPending(true);
                void backupAction().then((result) => {
                  setMessage(result.message);
                  setPending(false);
                  if (result.ok) {
                    router.refresh();
                  }
                });
              }}
            >
              Export database
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void cacheAction().then((result) => {
                  setMessage(result.message);
                  setPending(false);
                });
              }}
            >
              Clear cache
            </Button>
          </div>
          <Select
            label="Restore file"
            value={file}
            onChange={(event) => setFile(event.target.value)}
          >
            {backups.length === 0 ? <option value="">No backups yet</option> : null}
            {backups.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
          <Input
            label="Type RESTORE to replace the database"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
          <Button
            variant="destructive"
            disabled={!file || confirm !== "RESTORE"}
            onClick={() => setRestoreOpen(true)}
          >
            Restore backup
          </Button>
          {message ? (
            <p role="status" className="text-sm text-foreground">
              {message}
            </p>
          ) : null}
          <AlertDialog
            open={restoreOpen}
            onOpenChange={setRestoreOpen}
            title="Restore backup"
            description={`This replaces the live database with "${file}". Orders and changes made since this backup are lost. This cannot be undone.`}
            confirmLabel="Restore backup"
            cancelLabel="Cancel"
            isLoading={pending}
            loadingLabel="Restoring…"
            onConfirm={() => {
              setPending(true);
              void restoreAction({ file, confirm }).then((result) => {
                setMessage(result.message);
                setPending(false);
                setRestoreOpen(false);
              });
            }}
          />
        </div>
      }
    />
  );
}
