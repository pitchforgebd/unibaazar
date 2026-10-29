import { Badge } from "@/components/ui/Badge";

export function LoginHistoryPanel({
  rows,
}: {
  rows: {
    id: string;
    identity: string;
    success: boolean;
    ipAddress: string | null;
    userAgent: string | null;
    reason: string | null;
    createdAt: string;
    user: string | null;
  }[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Login history</h1>
        <p className="text-sm text-muted">Successful and failed sign-in attempts.</p>
      </div>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">When</th>
              <th className="px-3 py-2 font-semibold">Identity</th>
              <th className="px-3 py-2 font-semibold">Result</th>
              <th className="px-3 py-2 font-semibold">IP</th>
              <th className="px-3 py-2 font-semibold">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink/5">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString("en-GB", {
                    timeZone: "Asia/Dhaka",
                  })}
                </td>
                <td className="px-3 py-2">
                  <p className="font-semibold text-ink">{row.identity}</p>
                  {row.user ? <p className="text-xs text-muted">{row.user}</p> : null}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={row.success ? "success" : "outline"}>
                    {row.success ? "OK" : "Failed"}
                  </Badge>
                </td>
                <td className="px-3 py-2">{row.ipAddress ?? "—"}</td>
                <td className="px-3 py-2">{row.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
