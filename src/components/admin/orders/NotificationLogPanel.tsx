import { Badge } from "@/components/ui/Badge";
import type { EmailLogRow, SmsLogRow } from "@/server/admin/notify";

function statusVariant(status: string): "success" | "accent" | "outline" {
  if (status === "sent") {
    return "success";
  }
  if (status === "failed") {
    return "accent";
  }
  return "outline";
}

function when(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
}

export function NotificationLogPanel({
  sms,
  email,
}: {
  sms: SmsLogRow[];
  email: EmailLogRow[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">SMS log</h2>
        <p className="text-sm text-muted">
          Last {sms.length} send attempts, most recent first — OTP, order updates, and
          admin test sends alike.
        </p>
        <div className="mt-2 overflow-x-auto rounded-theme bg-card shadow-soft">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink/5 text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">To</th>
                <th className="px-3 py-2 font-semibold">Provider</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {sms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No SMS sent yet.
                  </td>
                </tr>
              ) : (
                sms.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5">
                    <td className="px-3 py-2 whitespace-nowrap">{when(row.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.to}</td>
                    <td className="px-3 py-2">{row.provider}</td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2 max-w-sm truncate" title={row.body}>
                      {row.body}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-ink">Email log</h2>
        <p className="text-sm text-muted">
          Last {email.length} send attempts, most recent first.
        </p>
        <div className="mt-2 overflow-x-auto rounded-theme bg-card shadow-soft">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-ink/5 text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">When</th>
                <th className="px-3 py-2 font-semibold">To</th>
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {email.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted">
                    No emails sent yet.
                  </td>
                </tr>
              ) : (
                email.map((row) => (
                  <tr key={row.id} className="border-b border-ink/5">
                    <td className="px-3 py-2 whitespace-nowrap">{when(row.createdAt)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{row.to}</td>
                    <td className="px-3 py-2 max-w-sm truncate" title={row.subject}>
                      {row.subject}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
