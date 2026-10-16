"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportTable } from "@/server/admin/reports";

export function ReportChart({ table }: { table: ReportTable }) {
  const valueColumn = table.columns.length - 1;
  const data = table.rows
    .slice(0, 15)
    .map((row) => ({ label: row[0] ?? "", value: Number(row[valueColumn]) }))
    .filter((row) => Number.isFinite(row.value));
  if (data.length < 2) {
    return null;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={data.length > 6 ? -25 : 0}
          textAnchor={data.length > 6 ? "end" : "middle"}
          height={data.length > 6 ? 48 : 24}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          fill="#F95B09"
          name={table.columns[valueColumn]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
