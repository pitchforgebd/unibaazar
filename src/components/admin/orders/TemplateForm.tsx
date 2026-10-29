"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { templatesAction } from "@/app/(admin)/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";
import type { NotifyTemplates } from "@/server/admin/notify";

export function TemplateForm({ templates }: { templates: NotifyTemplates }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [sms, setSms] = useState(templates.sms);
  const [emailSubject, setEmailSubject] = useState(templates.emailSubject);
  const [emailBody, setEmailBody] = useState(templates.emailBody);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Message templates</h1>
      <p className="text-sm text-muted">
        Tokens: {"{name}"}, {"{order_id}"}, {"{status}"}, {"{total}"}, {"{tracking}"}. A
        status change queues these messages. They stay queued until an SMS gateway and
        SMTP are connected.
      </p>
      <Textarea
        label="SMS"
        value={sms}
        onChange={(event) => setSms(event.target.value)}
      />
      <Input
        label="Email subject"
        value={emailSubject}
        onChange={(event) => setEmailSubject(event.target.value)}
      />
      <Textarea
        label="Email body"
        rows={8}
        value={emailBody}
        onChange={(event) => setEmailBody(event.target.value)}
      />
      <Button
        isLoading={pending}
        onClick={() => {
          setPending(true);
          void templatesAction({ sms, emailSubject, emailBody }).then((result) => {
            push({ message: result.message, type: result.ok ? "success" : "error" });
            setPending(false);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        Save templates
      </Button>
    </div>
  );
}
