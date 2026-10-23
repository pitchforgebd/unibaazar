"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  campaignAction,
  recoveryAction,
  sendCampaignAction,
  subscriberAction,
} from "@/app/(admin)/admin/marketing-actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";

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
  const push = useToastStore((state) => state.push);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  function run(task: () => Promise<{ ok: boolean; message: string }>): void {
    setPending(true);
    void task().then((result) => {
      push({ message: result.message, type: result.ok ? "success" : "error" });
      setPending(false);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Audience</h1>
      <section className="space-y-3">
        <h2 className="font-heading font-semibold text-ink">Subscribers</h2>
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
          className="grid gap-3 rounded-theme bg-card p-4 shadow-soft sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => subscriberAction({ email, phone }));
          }}
        >
          <Input
            label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <div className="sm:col-span-2">
            <Button type="submit" isLoading={pending}>
              Save subscriber
            </Button>
          </div>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading font-semibold text-ink">Campaigns</h2>
        <p className="text-sm text-muted">
          Sending queues SMS or email. Messages stay queued until a gateway is connected.
        </p>
        {campaigns.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-theme bg-card p-4 shadow-soft"
          >
            <p className="flex items-center gap-2 text-sm text-ink">
              <span className="font-semibold">{row.name}</span> · {row.channel} ·{" "}
              <Badge variant={row.status === "DRAFT" ? "default" : "success"}>
                {row.status.toLowerCase()}
              </Badge>
              {row.sentAt ? ` · ${row.sentAt}` : ""}
            </p>
            {row.status === "DRAFT" ? (
              <Button
                variant="outline"
                isLoading={pending}
                onClick={() => run(() => sendCampaignAction({ id: row.id }))}
              >
                Queue send
              </Button>
            ) : null}
          </div>
        ))}
        <form
          className="grid gap-3 rounded-theme bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => campaignAction({ name, channel, subject, body }));
          }}
        >
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Select
            label="Channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
          >
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </Select>
          <Input
            label="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <Textarea
            label="Message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <Button type="submit" isLoading={pending}>
            Save draft
          </Button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-heading font-semibold text-ink">Abandoned carts</h2>
        {carts.length === 0 ? <p className="text-sm text-muted">No open carts.</p> : null}
        {carts.map((cart) => (
          <div
            key={cart.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-theme bg-card p-4 shadow-soft"
          >
            <p className="text-sm text-ink">
              <span className="font-semibold">{cart.who}</span> · {cart.items} items ·{" "}
              {cart.phone || cart.email || "No contact"}
            </p>
            <Button
              variant="outline"
              isLoading={pending}
              onClick={() => run(() => recoveryAction({ id: cart.id }))}
            >
              Queue reminder
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
