"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { revokeSessionAction } from "@/app/(admin)/admin/user-actions";

export function SessionsPanel({
  rows,
}: {
  rows: {
    id: string;
    user: string;
    role: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    lastSeenAt: string;
  }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Active sessions</h1>
        <p className="text-sm text-muted">
          Revoke a device session to force sign-in again.
        </p>
      </div>
      {message ? (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">User</th>
              <th className="px-3 py-2 font-semibold">IP</th>
              <th className="px-3 py-2 font-semibold">Last seen</th>
              <th className="px-3 py-2 font-semibold">Agent</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/5">
                <td className="px-3 py-2">
                  <p className="font-semibold text-ink">{row.user}</p>
                  <p className="text-xs text-muted">{row.role}</p>
                </td>
                <td className="px-3 py-2">{row.ipAddress ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.lastSeenAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Dhaka",
                  })}
                </td>
                <td
                  className="px-3 py-2 max-w-xs truncate"
                  title={row.userAgent ?? undefined}
                >
                  {row.userAgent ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={pending}
                    loadingLabel="Revoking…"
                    onClick={() =>
                      start(() => {
                        void revokeSessionAction({ sessionId: row.id }).then((result) =>
                          setMessage(result.message),
                        );
                      })
                    }
                  >
                    Revoke
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
