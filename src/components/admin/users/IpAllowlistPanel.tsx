"use client";

import { useState, useTransition } from "react";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { saveIpAllowlistAction } from "@/app/(admin)/admin/user-actions";

export function IpAllowlistPanel({ value }: { value: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Admin IP allow-list</h1>
        <p className="text-sm text-muted">
          Optional. Leave blank to allow any IP. One address per line. Localhost is{" "}
          <code>127.0.0.1</code>.
        </p>
      </div>
      <form
        className="max-w-xl space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          start(() => {
            void saveIpAllowlistAction({ value: String(form.get("value") ?? "") }).then(
              (result) => setMessage(result.message),
            );
          });
        }}
      >
        <label className="block text-sm">
          Allowed IPs
          <textarea
            name="value"
            rows={8}
            defaultValue={value}
            className={`${fieldClass} mt-1 font-mono text-xs`}
            placeholder={"127.0.0.1\n203.0.113.10"}
          />
        </label>
        <button type="submit" className={buttonClass("primary")} disabled={pending}>
          Save
        </button>
      </form>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </div>
  );
}
