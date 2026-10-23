import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/motion";
import { formatTaka } from "@/lib/utils/currency";
import type { CustomerListQuery, CustomerRow } from "@/server/admin/customers";

function listHref(query: CustomerListQuery, page: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.blocked) params.set("blocked", query.blocked);
  if (query.tag) params.set("tag", query.tag);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/customers?${text}` : "/admin/customers";
}

function exportHref(query: CustomerListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.blocked) params.set("blocked", query.blocked);
  if (query.tag) params.set("tag", query.tag);
  const text = params.toString();
  return text ? `/admin/customers/export?${text}` : "/admin/customers/export";
}

export function CustomerList({
  rows,
  query,
  page,
  pages,
  total,
}: {
  rows: CustomerRow[];
  query: CustomerListQuery;
  page: number;
  pages: number;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Customers</h1>
          <p className="text-sm text-muted">
            {total} {total === 1 ? "customer" : "customers"}
          </p>
        </div>
        <a href={exportHref(query)} className={buttonStyles({ variant: "outline" })}>
          Export CSV
        </a>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
      >
        <Input
          name="q"
          label="Search"
          defaultValue={query.q}
          placeholder="Name, phone, or email"
          containerClassName="sm:col-span-2"
        />
        <Select name="blocked" label="Status" defaultValue={query.blocked}>
          <option value="">Anyone</option>
          <option value="open">Open</option>
          <option value="blocked">Blocked</option>
        </Select>
        <Input name="tag" label="Segment" defaultValue={query.tag} placeholder="vip" />
        <div className="flex items-end gap-2 sm:col-span-2">
          <Button type="submit">Apply filters</Button>
          <Link href="/admin/customers" className={buttonStyles({ variant: "outline" })}>
            Clear
          </Link>
        </div>
      </form>

      <Reveal className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Customer</th>
              <th className="px-3 py-3 font-semibold">Orders</th>
              <th className="px-3 py-3 font-semibold">Lifetime value</th>
              <th className="px-3 py-3 font-semibold">Tags</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  No customers match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-ink/10 last:border-0">
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/customers/${row.id}`}
                      className="font-semibold text-primary"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-muted">{row.phone}</p>
                    {row.email ? <p className="text-xs text-muted">{row.email}</p> : null}
                  </td>
                  <td className="px-3 py-3">{row.orders}</td>
                  <td className="px-3 py-3">{formatTaka(row.lifetimeValue)}</td>
                  <td className="px-3 py-3">
                    {row.tags.length > 0 ? row.tags.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={row.blocked ? "outline" : "success"}>
                      {row.blocked ? "Blocked" : "Open"}
                    </Badge>
                    <p className="mt-1 text-xs text-muted">{row.joined}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Reveal>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Page {page} of {pages}
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={listHref(query, page - 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Previous
            </Link>
          ) : null}
          {page < pages ? (
            <Link
              href={listHref(query, page + 1)}
              className={buttonStyles({ variant: "outline" })}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
