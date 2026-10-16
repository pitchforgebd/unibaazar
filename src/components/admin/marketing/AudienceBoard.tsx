"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  campaignAction,
  recoveryAction,
  sendCampaignAction,
  subscriberAction,
} from "@/app/(admin)/admin/marketing-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

type SubscriberRow = { id: string; email: string; phone: string; at: string };
type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  status: string;
  sentAt: string;
};
type CartRow = {
  id: string;
  who: string;
  phone: string;
  email: string;
  items: number;
  updatedAt: string;
};

export function AudienceBoard({
  subscribers,
  campaigns,
  carts,
}: {
  subscribers: SubscriberRow[];
  campaigns: CampaignRow[];
  carts: CartRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function run(task: () => Promise<{ ok: boolean; message: string }>): void {
    setPending(true);
    void task().then((result) => {
      setMessage(result.message);
      setPending(false);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Audience</h1>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      <section className="space-y-3">
        <h2 className="font-semibold text-ink">Subscribers</h2>
        {subscribers.length === 0 ? (
          <p className="text-sm text-muted">No subscribers yet.</p>
        ) : null}
        {subscribers.map((row) => (
          <p key={row.id} className="text-sm text-ink">
            {row.email}
            {row.phone ? ` · ${row.phone}` : ""}
          </p>
        ))}
        <form
          className="grid gap-3 rounded-lg bg-card p-4 shadow-soft sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => subscriberAction({ email, phone }));
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Phone</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" className={buttonClass()} disabled={pending}>
              Save subscriber
            </button>
          </div>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-ink">Campaigns</h2>
        <p className="text-sm text-muted">
          Sending queues SMS or email. Messages stay queued until a gateway is connected.
        </p>
        {campaigns.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-4 shadow-soft"
          >
            <p className="text-sm text-ink">
              <span className="font-semibold">{row.name}</span> · {row.channel} ·{" "}
              {row.status.toLowerCase()}
              {row.sentAt ? ` · ${row.sentAt}` : ""}
            </p>
            {row.status === "DRAFT" ? (
              <button
                type="button"
                className={buttonClass("outline")}
                disabled={pending}
                onClick={() => run(() => sendCampaignAction({ id: row.id }))}
              >
                Queue send
              </button>
            ) : null}
          </div>
        ))}
        <form
          className="grid gap-3 rounded-lg bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => campaignAction({ name, channel, subject, body }));
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Channel</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              className={fieldClass}
            >
              <option value="EMAIL">Email</option>
              <option value="SMS">SMS</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Subject</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-ink">Message</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={`${fieldClass} h-24 py-2`}
            />
          </label>
          <button type="submit" className={buttonClass()} disabled={pending}>
            Save draft
          </button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-ink">Abandoned carts</h2>
        {carts.length === 0 ? <p className="text-sm text-muted">No open carts.</p> : null}
        {carts.map((cart) => (
          <div
            key={cart.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-4 shadow-soft"
          >
            <p className="text-sm text-ink">
              <span className="font-semibold">{cart.who}</span> · {cart.items} items ·{" "}
              {cart.phone || cart.email || "No contact"}
            </p>
            <button
              type="button"
              className={buttonClass("outline")}
              disabled={pending}
              onClick={() => run(() => recoveryAction({ id: cart.id }))}
            >
              Queue reminder
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
