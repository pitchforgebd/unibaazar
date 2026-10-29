"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  setRolePermissionAction,
  syncRolesAction,
} from "@/app/(admin)/admin/user-actions";

type Matrix = {
  permissions: { slug: string; name: string }[];
  roles: { id: string; slug: string; name: string; grants: string[] }[];
};

export function RolesMatrix({ matrix }: { matrix: Matrix }) {
  const [rows, setRows] = useState(matrix.roles);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Roles &amp; permissions</h1>
          <p className="text-sm text-muted">
            Toggle grants per staff role. Sync restores the seeded defaults.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          isLoading={pending}
          loadingLabel="Syncing…"
          onClick={() =>
            start(() => {
              void syncRolesAction().then((result) => setMessage(result.message));
            })
          }
        >
          Sync defaults
        </Button>
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
              <th className="px-3 py-2 font-semibold">Permission</th>
              {rows.map((role) => (
                <th key={role.id} className="px-3 py-2 font-semibold">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.permissions.map((permission) => (
              <tr key={permission.slug} className="border-b border-ink/5">
                <td className="px-3 py-2">
                  <p className="font-semibold text-ink">{permission.name}</p>
                  <p className="text-xs text-muted">{permission.slug}</p>
                </td>
                {rows.map((role) => {
                  const checked = role.grants.includes(permission.slug);
                  return (
                    <td key={`${role.id}-${permission.slug}`} className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={pending}
                        aria-label={`${role.name} ${permission.name}`}
                        className="size-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(event) => {
                          const enabled = event.target.checked;
                          setRows((current) =>
                            current.map((item) =>
                              item.id === role.id
                                ? {
                                    ...item,
                                    grants: enabled
                                      ? [...new Set([...item.grants, permission.slug])]
                                      : item.grants.filter(
                                          (slug) => slug !== permission.slug,
                                        ),
                                  }
                                : item,
                            ),
                          );
                          start(() => {
                            void setRolePermissionAction({
                              roleSlug: role.slug,
                              permissionSlug: permission.slug,
                              enabled,
                            }).then((result) => {
                              if (!result.ok) {
                                setMessage(result.message);
                                setRows(matrix.roles);
                              }
                            });
                          });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
