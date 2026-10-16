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
import { buttonClass, fieldClass } from "@/components/ui/controls";
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
        <div className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
          <h2 className="font-semibold text-ink">Backup and cache</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass()}
              disabled={pending}
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
            </button>
            <button
              type="button"
              className={buttonClass("outline")}
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
            </button>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Restore file</span>
            <select
              value={file}
              onChange={(event) => setFile(event.target.value)}
              className={fieldClass}
            >
              {backups.length === 0 ? <option value="">No backups yet</option> : null}
              {backups.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">
              Type RESTORE to replace the database
            </span>
            <input
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            className={buttonClass("ink")}
            disabled={pending || !file}
            onClick={() => {
              setPending(true);
              void restoreAction({ file, confirm }).then((result) => {
                setMessage(result.message);
                setPending(false);
              });
            }}
          >
            Restore backup
          </button>
          {message ? <p className="text-sm text-ink">{message}</p> : null}
        </div>
      }
    />
  );
}
