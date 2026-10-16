"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const response = await fetch("/api/v1/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      setStatus("error");
      return;
    }
    setStatus("done");
    setEmail("");
  }

  if (status === "done") {
    return <p className="mt-3 text-sm text-success">{t("subscribed")}</p>;
  }

  return (
    <form className="mt-3 flex gap-2" onSubmit={handleSubmit}>
      <label htmlFor="newsletter-email" className="sr-only">
        {t("email")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        name="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
        autoComplete="email"
        className="h-11 min-w-0 flex-1 rounded-md border border-black/10 px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-11 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {status === "sending" ? t("subscribing") : t("subscribe")}
      </button>
      {status === "error" ? (
        <p className="mt-1 w-full basis-full text-xs text-red-700">
          {t("subscribeError")}
        </p>
      ) : null}
    </form>
  );
}
