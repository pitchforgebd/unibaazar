"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrafficChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis hide />
        <Tooltip
          formatter={(value) => `${value} page views`}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#2563EB"
          strokeWidth={2}
          fill="url(#trafficFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
