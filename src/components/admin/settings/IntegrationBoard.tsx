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
import { Button } from "@/components/ui/Button";
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
        sslcommerzStorePass: "",
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
          name: "sslcommerzEnabled",
          label: "SSLCommerz enabled",
          kind: "checkbox",
          hint: "Aggregator checkout covering bKash/Nagad/Rocket/card — bKash/Nagad above are merchant-info-only today and route through this.",
        },
        {
          name: "sslcommerzStoreId",
          label: "SSLCommerz store ID",
          kind: "text",
          hint: "The Store ID from your SSLCommerz merchant panel.",
        },
        {
          name: "sslcommerzStorePass",
          label: "SSLCommerz store password",
          kind: "password",
          hint: "The Store Password (API credential) from your SSLCommerz merchant panel.",
        },
        {
          name: "sslcommerzSandbox",
          label: "Sandbox mode",
          kind: "checkbox",
          hint: "On: sandbox.sslcommerz.com (test payments only). Off: the live gateway — only turn off with real, verified store credentials.",
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
          <Button variant="outline" disabled={pending} onClick={() => run(smsTestAction)}>
            Test SMS
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(emailTestAction)}
          >
            Test email
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(paymentTestAction)}
          >
            Test payment
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(courierTestAction)}
          >
            Test Steadfast courier
          </Button>
          {message ? (
            <p role="status" className="w-full text-sm text-foreground">
              {message}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
