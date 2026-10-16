"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  courierWebhookAction,
  resetCourierWebhookAction,
} from "@/app/(admin)/admin/settings-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import type { WebhookHealth } from "@/server/courier/webhook";

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const healthLabel: Record<WebhookHealth["status"], string> = {
  unconfigured: "Not set up",
  healthy: "Healthy",
  failing: "Failing",
};

const healthClass: Record<WebhookHealth["status"], string> = {
  unconfigured: "bg-black/5 text-muted",
  healthy: "bg-success/10 text-success",
  failing: "bg-red-100 text-red-700",
};

export function CourierWebhookPanel({
  webhookUrl,
  token: initialToken,
  health,
}: {
  webhookUrl: string;
  token: string;
  health: WebhookHealth;
}) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [showToken, setShowToken] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void courierWebhookAction({ token }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <h2 className="font-semibold text-ink">Steadfast delivery webhook</h2>
        <p className="text-sm text-muted">
          Steadfast posts delivery status updates here so order status and tracking stay
          in sync automatically, instead of relying on manual &quot;Sync courier&quot;
          checks.
        </p>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Callback URL</span>
          <input
            readOnly
            value={webhookUrl}
            onFocus={(event) => event.currentTarget.select()}
            className={`${fieldClass} bg-black/5`}
          />
          <span className="mt-1 block text-xs text-muted">
            Paste this into your Steadfast merchant panel&apos;s webhook settings.
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">Auth token</span>
          <div className="flex gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className={fieldClass}
            />
            <button
              type="button"
              className={buttonClass("outline")}
              onClick={() => setShowToken((value) => !value)}
            >
              {showToken ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              className={buttonClass("outline")}
              onClick={() => setToken(randomToken())}
            >
              Generate
            </button>
          </div>
          <span className="mt-1 block text-xs text-muted">
            Sent as <code>Authorization: Bearer &lt;token&gt;</code>. Give Steadfast this
            same token so only their calls are accepted. Letters, digits and - _ . = only.
          </span>
        </label>
        <button type="submit" className={buttonClass()} disabled={pending}>
          Save webhook
        </button>
        {message ? <p className="text-sm text-ink">{message}</p> : null}
      </form>
      <div className="space-y-3 rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Delivery health</h2>
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${healthClass[health.status]}`}
        >
          {healthLabel[health.status]}
        </span>
        {health.status === "failing" ? (
          <p className="text-sm text-muted">
            {health.consecutiveFailures} failed deliveries in a row. Last answer:{" "}
            {health.lastStatusCode ?? "—"}
            {health.lastAt ? `, ${new Date(health.lastAt).toLocaleString("en-GB")}` : ""}.
          </p>
        ) : health.status === "healthy" ? (
          <p className="text-sm text-muted">
            Last call: {health.lastStatusCode ?? "—"}
            {health.lastAt
              ? ` at ${new Date(health.lastAt).toLocaleString("en-GB")}`
              : ""}
            .
          </p>
        ) : (
          <p className="text-sm text-muted">
            Save an auth token to start accepting webhooks.
          </p>
        )}
        <button
          type="button"
          className={buttonClass("outline")}
          disabled={resetting}
          onClick={() => {
            setResetting(true);
            void resetCourierWebhookAction().then((result) => {
              setResetting(false);
              setMessage(result.message);
              router.refresh();
            });
          }}
        >
          Reset and resume
        </button>
        <p className="text-xs text-muted">
          Fixed your endpoint? This clears the failure count. Nothing is resent; the next
          parcel update is sent as usual.
        </p>
      </div>
    </div>
  );
}
