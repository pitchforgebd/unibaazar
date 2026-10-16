"use client";

import { useState } from "react";
import {
  courierTestAction,
  emailTestAction,
  integrationAction,
  paymentTestAction,
  smsTestAction,
} from "@/app/(admin)/admin/settings-actions";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { buttonClass } from "@/components/ui/controls";
import type { IntegrationSettings } from "@/server/settings/store";

export function IntegrationBoard({ values }: { values: IntegrationSettings }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function run(action: () => Promise<{ message: string }>): void {
    setPending(true);
    void action().then((result) => {
      setMessage(result.message);
      setPending(false);
    });
  }

  return (
    <SettingsForm
      title="Integrations"
      intro="Payment gateways, SMS, email, and courier credentials, grouped by service. Secrets stay blank here after they are saved. A test queues a log or an audit and does not charge a customer."
      initial={{
        ...values,
        bkashSecret: "",
        nagadSecret: "",
        smsSecret: "",
        emailSecret: "",
        courierSecret: "",
      }}
      save={integrationAction}
      fields={[
        {
          name: "bkashEnabled",
          label: "bKash enabled",
          kind: "checkbox",
          section: "Payment gateways",
          sectionIntro:
            "Turn on a gateway and add its merchant credentials to accept it at checkout.",
        },
        {
          name: "bkashMerchant",
          label: "bKash merchant number",
          kind: "text",
          hint: "The merchant/agent number from your bKash Merchant Portal.",
        },
        {
          name: "bkashSecret",
          label: "bKash API secret",
          kind: "password",
          hint: "App secret key from the bKash Merchant Portal.",
        },
        { name: "nagadEnabled", label: "Nagad enabled", kind: "checkbox" },
        {
          name: "nagadMerchant",
          label: "Nagad merchant ID",
          kind: "text",
          hint: "The merchant ID from your Nagad Merchant Portal.",
        },
        {
          name: "nagadSecret",
          label: "Nagad API secret",
          kind: "password",
          hint: "Private/secret key from the Nagad Merchant Portal.",
        },
        {
          name: "smsSender",
          label: "SMS sender ID",
          kind: "text",
          section: "SMS notifications",
          sectionIntro:
            "Used to send order confirmation, OTP, and status update texts to customers.",
          hint: "The approved sender ID/mask from your SMS provider (e.g. BulkSMSBD).",
        },
        {
          name: "smsSecret",
          label: "SMS API key",
          kind: "password",
          hint: "API key issued by your SMS gateway provider.",
        },
        {
          name: "emailHost",
          label: "SMTP host",
          kind: "text",
          section: "Email (SMTP)",
          sectionIntro: "Used to send order receipts and account emails.",
          hint: "e.g. smtp.gmail.com or your hosting provider's mail server.",
        },
        {
          name: "emailPort",
          label: "SMTP port",
          kind: "text",
          hint: "Usually 587 (TLS) or 465 (SSL).",
        },
        {
          name: "emailUser",
          label: "SMTP username",
          kind: "text",
          hint: "The mailbox username used to authenticate with your SMTP server.",
        },
        {
          name: "emailFrom",
          label: "From address",
          kind: "text",
          hint: "The email address customers see as the sender, e.g. orders@yourstore.com.",
        },
        {
          name: "emailSecret",
          label: "SMTP password",
          kind: "password",
          hint: "The mailbox password or app-specific password.",
        },
        {
          name: "courierUser",
          label: "Steadfast API key",
          kind: "text",
          section: "Courier (Steadfast)",
          sectionIntro:
            "Steadfast Courier books and tracks deliveries automatically. Get these credentials from your Steadfast merchant panel under Settings → API.",
          hint: 'The "Api Key" from your Steadfast merchant panel.',
        },
        {
          name: "courierSecret",
          label: "Steadfast secret key",
          kind: "password",
          hint: 'The "Secret Key" from your Steadfast merchant panel.',
        },
      ]}
      extra={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("outline")}
            disabled={pending}
            onClick={() => run(smsTestAction)}
          >
            Test SMS
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            disabled={pending}
            onClick={() => run(emailTestAction)}
          >
            Test email
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            disabled={pending}
            onClick={() => run(paymentTestAction)}
          >
            Test payment
          </button>
          <button
            type="button"
            className={buttonClass("outline")}
            disabled={pending}
            onClick={() => run(courierTestAction)}
          >
            Test Steadfast courier
          </button>
          {message ? <p className="w-full text-sm text-ink">{message}</p> : null}
        </div>
      }
    />
  );
}
