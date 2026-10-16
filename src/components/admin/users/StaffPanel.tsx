"use client";

import { useState, useTransition } from "react";
import { buttonClass, fieldClass } from "@/components/ui/controls";
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

      <form method="get" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search name, phone, email"
          className={`${fieldClass} max-w-sm`}
        />
        <button type="submit" className={buttonClass("outline")}>
          Search
        </button>
      </form>

      <form
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-3"
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
        <label className="block text-sm">
          Name
          <input name="name" required className={`${fieldClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Phone
          <input
            name="phone"
            required
            className={`${fieldClass} mt-1`}
            placeholder="017xxxxxxxx"
          />
        </label>
        <label className="block text-sm">
          Email
          <input name="email" type="email" className={`${fieldClass} mt-1`} />
        </label>
        <label className="block text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="block text-sm">
          Role
          <select name="roleSlug" className={`${fieldClass} mt-1`} defaultValue="staff">
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className={buttonClass("primary")} disabled={pending}>
            Create
          </button>
        </div>
      </form>

      {message ? <p className="text-sm text-ink">{message}</p> : null}

      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
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
              <tr key={row.id} className="border-b border-black/5">
                <td className="px-3 py-2 font-semibold text-ink">{row.name}</td>
                <td className="px-3 py-2">{row.phone}</td>
                <td className="px-3 py-2">{row.roleName}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.totpEnabled ? "On" : "Off"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className={buttonClass("outline")}
                    onClick={() => setEditing(row)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <form
          className="grid gap-3 rounded-lg border border-black/10 bg-card p-4 sm:grid-cols-2"
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
          <label className="block text-sm">
            Name
            <input
              name="name"
              defaultValue={editing.name}
              required
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              name="email"
              type="email"
              defaultValue={editing.email}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-sm">
            Role
            <select
              name="roleSlug"
              defaultValue={editing.role}
              className={`${fieldClass} mt-1`}
            >
              {roles.map((role) => (
                <option key={role.slug} value={role.slug}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Status
            <select
              name="status"
              defaultValue={editing.status}
              className={`${fieldClass} mt-1`}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            New password (optional)
            <input
              name="password"
              type="password"
              minLength={6}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className={buttonClass("primary")} disabled={pending}>
              Save
            </button>
            <button
              type="button"
              className={buttonClass("outline")}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
