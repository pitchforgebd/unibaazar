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

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  const rows = data.filter((row) => row.count > 0);
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No orders yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 32)}>
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="rgba(0,0,0,0.06)"
        />
        <XAxis type="number" hide />
        <YAxis
          dataKey="status"
          type="category"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={110}
          tickFormatter={(value: string) => value.replace(/_/g, " ")}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#F95B09" />
      </BarChart>
    </ResponsiveContainer>
  );
}
