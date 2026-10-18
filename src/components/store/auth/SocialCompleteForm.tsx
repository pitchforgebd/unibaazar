"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CaptchaField } from "@/components/store/auth/CaptchaField";
import { buttonClass, fieldClass } from "@/components/ui/controls";

export function SocialCompleteForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const t = useTranslations("auth");
  const [phone, setPhone] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mx-auto max-w-md space-y-3 rounded-lg bg-card p-5 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        void fetch("/api/v1/auth/oauth/complete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone, captchaToken }),
        })
          .then(async (response) => {
            const body: unknown = await response.json().catch(() => null);
            if (!response.ok) {
              const message =
                typeof body === "object" &&
                body &&
                "error" in body &&
                typeof body.error === "string"
                  ? body.error
                  : t("errorFinishSignIn");
              setError(message);
              setPending(false);
              return;
            }
            router.push("/account");
            router.refresh();
          })
          .catch(() => {
            setError(t("errorFinishSignIn"));
            setPending(false);
          });
      }}
    >
      <p className="text-sm text-muted">
        {name && email
          ? t("socialWelcome", { name, email })
          : name
            ? t("socialWelcomeNoEmail", { name })
            : email
              ? t("socialWelcomeGenericEmail", { email })
              : t("socialWelcomeGeneric")}
      </p>
      <label className="block text-sm">
        {t("fieldPhone")}
        <input
          className={`${fieldClass} mt-1`}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
        />
      </label>
      <CaptchaField onToken={setCaptchaToken} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass()} disabled={pending}>
        {t("submitFinishAccount")}
      </button>
    </form>
  );
}
