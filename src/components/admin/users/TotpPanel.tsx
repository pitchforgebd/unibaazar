"use client";

import { useState, useTransition } from "react";
import {
  confirmTotpAction,
  disableTotpAction,
  logoutOtherDevicesAction,
  startTotpAction,
} from "@/app/(admin)/admin/user-actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function TotpPanel({ enabled }: { enabled: boolean }) {
  const [message, setMessage] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">My two-factor authentication</h1>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          Status:{" "}
          <Badge variant={enabled ? "success" : "default"}>
            {enabled ? "On" : "Off"}
          </Badge>
        </p>
        <p className="text-sm text-muted">
          Use an authenticator app such as Google Authenticator.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          isLoading={pending}
          loadingLabel="Starting…"
          onClick={() =>
            start(() => {
              void startTotpAction().then(async (result) => {
                setMessage(result.message);
                if (result.ok && result.secret && result.otpauth) {
                  setSecret(result.secret);
                  setOtpauth(result.otpauth);
                  const QRCode = (await import("qrcode")).default;
                  setQr(
                    await QRCode.toDataURL(result.otpauth, { margin: 1, width: 220 }),
                  );
                }
              });
            })
          }
        >
          {enabled ? "Reset 2FA" : "Set up 2FA"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(() => {
              void logoutOtherDevicesAction().then((result) =>
                setMessage(result.message),
              );
            })
          }
        >
          Sign out other devices
        </Button>
      </div>

      {secret && otpauth ? (
        <div className="max-w-md space-y-3 rounded-theme bg-card p-4 shadow-soft">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="2FA QR code" className="mx-auto h-[220px] w-[220px]" />
          ) : null}
          <p className="break-all font-mono text-xs text-muted">{secret}</p>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              start(() => {
                void confirmTotpAction({ code: String(form.get("code") ?? "") }).then(
                  (result) => {
                    setMessage(result.message);
                    if (result.ok) {
                      setSecret(null);
                      setOtpauth(null);
                      setQr(null);
                    }
                  },
                );
              });
            }}
          >
            <Input name="code" label="Confirm code" inputMode="numeric" required />
            <Button type="submit" isLoading={pending} loadingLabel="Enabling…">
              Enable 2FA
            </Button>
          </form>
        </div>
      ) : null}

      {enabled ? (
        <form
          className="max-w-md space-y-2 rounded-theme bg-card p-4 shadow-soft"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            start(() => {
              void disableTotpAction({ code: String(form.get("code") ?? "") }).then(
                (result) => setMessage(result.message),
              );
            });
          }}
        >
          <Input
            name="code"
            label="Disable with current code"
            inputMode="numeric"
            required
          />
          <Button
            type="submit"
            variant="outline"
            isLoading={pending}
            loadingLabel="Turning off…"
          >
            Turn off 2FA
          </Button>
        </form>
      ) : null}

      {message ? (
        <p role="status" className="text-sm text-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
