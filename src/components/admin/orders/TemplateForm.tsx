"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { templatesAction } from "@/app/(admin)/admin/order-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import type { NotifyTemplates } from "@/server/admin/notify";

export function TemplateForm({ templates }: { templates: NotifyTemplates }) {
  const router = useRouter();
  const [sms, setSms] = useState(templates.sms);
  const [emailSubject, setEmailSubject] = useState(templates.emailSubject);
  const [emailBody, setEmailBody] = useState(templates.emailBody);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Message templates</h1>
      <p className="text-sm text-muted">
        Tokens: {"{name}"}, {"{order_id}"}, {"{status}"}, {"{total}"}, {"{tracking}"}. A
        status change queues these messages. They stay queued until an SMS gateway and
        SMTP are connected.
      </p>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">SMS</span>
        <textarea
          value={sms}
          onChange={(event) => setSms(event.target.value)}
          className={`${fieldClass} h-24 py-2`}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">Email subject</span>
        <input
          value={emailSubject}
          onChange={(event) => setEmailSubject(event.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-ink">Email body</span>
        <textarea
          value={emailBody}
          onChange={(event) => setEmailBody(event.target.value)}
          className={`${fieldClass} h-40 py-2`}
        />
      </label>
      <button
        type="button"
        className={buttonClass()}
        disabled={pending}
        onClick={() => {
          setPending(true);
          void templatesAction({ sms, emailSubject, emailBody }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        Save templates
      </button>
    </div>
  );
}
