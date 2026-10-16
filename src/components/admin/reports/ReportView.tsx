import Link from "next/link";
import {
  reportIds,
  reportLabels,
  type ReportQuery,
} from "@/lib/validation/admin-reports";
import type { ReportTable } from "@/server/admin/reports";
import { ReportChart } from "@/components/admin/charts/ReportChart";
import { buttonClass, fieldClass } from "@/components/ui/controls";

function queryString(query: ReportQuery, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ report: query.report, preset: query.preset });
  if (query.from) {
    params.set("from", query.from);
  }
  if (query.to) {
    params.set("to", query.to);
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    params.set(key, value);
  }
  return params.toString();
}

export function ReportView({
  query,
  table,
  print,
}: {
  query: ReportQuery;
  table: ReportTable;
  print?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <p className="text-sm text-muted">
          Amounts are in BDT. Today, the last 7 days, and the last 30 days use Asia/Dhaka.
        </p>
      </div>
      <form
        action="/admin/reports"
        method="get"
        className="grid gap-3 rounded-lg bg-card p-4 shadow-soft print:hidden md:grid-cols-4"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Report</span>
          <select name="report" defaultValue={query.report} className={fieldClass}>
            {reportIds.map((id) => (
              <option key={id} value={id}>
                {reportLabels[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Range</span>
          <select name="preset" defaultValue={query.preset} className={fieldClass}>
            <option value="day">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">From</span>
          <input
            type="date"
            name="from"
            defaultValue={query.from ?? ""}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">To</span>
          <input
            type="date"
            name="to"
            defaultValue={query.to ?? ""}
            className={fieldClass}
          />
        </label>
        <button type="submit" className={buttonClass()}>
          Show
        </button>
      </form>
      <section className="rounded-lg bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{table.title}</h2>
            <p className="text-sm text-muted">{table.rangeLabel}</p>
            <p className="mt-1 text-sm text-muted">{table.note}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link
              className={buttonClass("outline")}
              href={`/admin/reports/export?${queryString(query, { format: "csv" })}`}
            >
              CSV
            </Link>
            <Link
              className={buttonClass("outline")}
              href={`/admin/reports/export?${queryString(query, { format: "xls" })}`}
            >
              Excel
            </Link>
            <Link
              className={buttonClass("outline")}
              href={`/admin/reports/export?${queryString(query, { format: "pdf" })}`}
            >
              PDF
            </Link>
          </div>
        </div>
        {table.rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No rows in this range.</p>
        ) : (
          <>
            <div className="mt-4 print:hidden">
              <ReportChart table={table} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[520px] w-full text-left text-sm">
                <thead className="border-b border-black/5 text-muted">
                  <tr>
                    {table.columns.map((column) => (
                      <th key={column} className="px-3 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr
                      key={`${row.join("-")}-${index}`}
                      className="border-b border-black/5 last:border-0"
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${table.columns[cellIndex] ?? "cell"}-${cell}`}
                          className="px-3 py-3"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {print ? (
          <p className="mt-4 text-sm text-muted print:hidden">
            Use the browser print dialog and choose Save as PDF.
          </p>
        ) : null}
      </section>
    </div>
  );
}
