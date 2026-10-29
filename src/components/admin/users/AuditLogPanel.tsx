import { Badge } from "@/components/ui/Badge";

export function AuditLogPanel({
  rows,
}: {
  rows: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    ipAddress: string | null;
    createdAt: string;
    actor: string;
  }[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Audit log</h1>
        <p className="text-sm text-muted">Recent admin and auth actions.</p>
      </div>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/5 text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">When</th>
              <th className="px-3 py-2 font-semibold">Actor</th>
              <th className="px-3 py-2 font-semibold">Action</th>
              <th className="px-3 py-2 font-semibold">Entity</th>
              <th className="px-3 py-2 font-semibold">IP</th>
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
                <td className="px-3 py-2">{row.actor}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{row.action}</Badge>
                </td>
                <td className="px-3 py-2">
                  {row.entityType}
                  {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="px-3 py-2">{row.ipAddress ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
