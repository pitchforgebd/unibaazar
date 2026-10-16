"use client";

import { useState, useTransition } from "react";
import {
  confirmTotpAction,
  disableTotpAction,
  logoutOtherDevicesAction,
  startTotpAction,
} from "@/app/(admin)/admin/user-actions";
import { buttonClass, fieldClass } from "@/components/ui/controls";

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
        <p className="text-sm text-muted">
          Status: <span className="font-semibold text-ink">{enabled ? "On" : "Off"}</span>
          . Use an authenticator app such as Google Authenticator.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass("primary")}
          disabled={pending}
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
        </button>
        <button
          type="button"
          className={buttonClass("outline")}
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
        </button>
      </div>

      {secret && otpauth ? (
        <div className="max-w-md space-y-3 rounded-lg bg-card p-4 shadow-soft">
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
            <label className="block text-sm">
              Confirm code
              <input
                name="code"
                inputMode="numeric"
                required
                className={`${fieldClass} mt-1`}
              />
            </label>
            <button type="submit" className={buttonClass("ink")} disabled={pending}>
              Enable 2FA
            </button>
          </form>
        </div>
      ) : null}

      {enabled ? (
        <form
          className="max-w-md space-y-2 rounded-lg bg-card p-4 shadow-soft"
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
          <label className="block text-sm">
            Disable with current code
            <input
              name="code"
              inputMode="numeric"
              required
              className={`${fieldClass} mt-1`}
            />
          </label>
          <button type="submit" className={buttonClass("outline")} disabled={pending}>
            Turn off 2FA
          </button>
        </form>
      ) : null}

      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </div>
  );
}
