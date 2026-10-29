"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStaffAction, updateStaffAction } from "@/app/(admin)/admin/user-actions";
import type { StaffRow } from "@/server/admin/users";

type RoleOption = { slug: string; name: string };

export function StaffPanel({
  rows,
  roles,
  query,
}: {
  rows: StaffRow[];
  roles: RoleOption[];
  query: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<StaffRow | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Staff accounts</h1>
        <p className="text-sm text-muted">
          Create and update admin users. Customers stay under Customers.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <Input
          name="q"
          label="Search"
          hideLabel
          defaultValue={query}
          placeholder="Search name, phone, email"
          containerClassName="max-w-sm flex-1"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <form
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          start(() => {
            void createStaffAction({
              name: String(form.get("name") ?? ""),
              phone: String(form.get("phone") ?? ""),
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
              roleSlug: String(form.get("roleSlug") ?? "staff"),
            }).then((result) => {
              setMessage(result.message);
              if (result.ok) {
                event.currentTarget.reset();
              }
            });
          });
        }}
      >
        <h2 className="sm:col-span-2 lg:col-span-3 text-lg font-semibold text-ink">
          Add staff
        </h2>
        <Input name="name" label="Name" required />
        <Input name="phone" label="Phone" required placeholder="017xxxxxxxx" />
        <Input name="email" label="Email" type="email" />
        <Input name="password" label="Password" type="password" required minLength={6} />
        <Select name="roleSlug" label="Role" defaultValue="staff">
          {roles.map((role) => (
            <option key={role.slug} value={role.slug}>
              {role.name}
            </option>
          ))}
        </Select>
        <div className="flex items-end">
          <Button type="submit" isLoading={pending} loadingLabel="Creating…">
            Create
          </Button>
        </div>
      </form>

      {message ? (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Phone</th>
              <th className="px-3 py-2 font-semibold">Role</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">2FA</th>
              <th className="px-3 py-2 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/5">
                <td className="px-3 py-2 font-semibold text-ink">{row.name}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{row.roleName}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.status === "ACTIVE" ? "success" : "default"}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">{row.totpEnabled ? "On" : "Off"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(row)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form
          className="grid gap-3 rounded-theme border border-muted bg-card p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            start(() => {
              void updateStaffAction({
                userId: editing.id,
                name: String(form.get("name") ?? ""),
                email: String(form.get("email") ?? ""),
                roleSlug: String(form.get("roleSlug") ?? editing.role),
                status: String(form.get("status") ?? editing.status),
                password: String(form.get("password") ?? ""),
              }).then((result) => {
                setMessage(result.message);
                if (result.ok) {
                  setEditing(null);
                }
              });
            });
          }}
        >
          <h2 className="sm:col-span-2 text-lg font-semibold text-ink">
            Edit {editing.name}
          </h2>
          <Input name="name" label="Name" defaultValue={editing.name} required />
          <Input name="email" label="Email" type="email" defaultValue={editing.email} />
          <Select name="roleSlug" label="Role" defaultValue={editing.role}>
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </Select>
          <Select name="status" label="Status" defaultValue={editing.status}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="DISABLED">DISABLED</option>
          </Select>
          <div className="sm:col-span-2">
            <Input
              name="password"
              label="New password (optional)"
              type="password"
              minLength={6}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" isLoading={pending} loadingLabel="Saving…">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
