"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { CaptchaField } from "@/components/store/auth/CaptchaField";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { faqs } from "@/lib/mock/content";
import { contactSchema, type ContactInput } from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";

export function ContactForm() {
  const t = useTranslations("cms");
  const v = useTranslations("validation");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: "", captchaToken: "" },
  });

  if (sent) {
    return (
      <p className="rounded-lg bg-card p-5 text-sm shadow-soft">
        {t("contact.successMessage")}
      </p>
    );
  }

  async function onSubmit(values: ContactInput) {
    setError("");
    const response = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        typeof body === "object" &&
        body &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : t("contact.genericError");
      setError(message);
      return;
    }
    setSent(true);
  }

  return (
    <form className="max-w-lg space-y-3" noValidate onSubmit={handleSubmit(onSubmit)}>
      <label className="block text-sm">
        {t("contact.nameLabel")}
        <input className={`${fieldClass} mt-1`} {...register("name")} />
        {errors.name ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.name.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("contact.phoneLabel")}
        <input className={`${fieldClass} mt-1`} {...register("phone")} />
        {errors.phone ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.phone.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("contact.emailLabel")}
        <input className={`${fieldClass} mt-1`} {...register("email")} />
        {errors.email ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.email.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("contact.messageLabel")}
        <textarea
          rows={4}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
          {...register("message")}
        />
        {errors.message ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.message.message)}
          </span>
        ) : null}
      </label>
      <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
        {isSubmitting ? t("contact.sending") : t("contact.submit")}
      </button>
    </form>
  );
}

export function FaqList() {
  const t = useTranslations("faq");
  return (
    <div>
      <div className="bg-ink px-4 py-3 text-sm font-semibold text-white">
        {t("heading")}
      </div>
      <div className="divide-y divide-black/5 rounded-b-lg bg-card shadow-soft">
        {faqs.map((item) => (
          <details key={item.question} className="p-4">
            <summary className="cursor-pointer font-semibold">{item.question}</summary>
            <p className="mt-2 text-sm text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

const sizes = [
  { size: "S", chest: "36", length: "26" },
  { size: "M", chest: "38", length: "27" },
  { size: "L", chest: "40", length: "28" },
  { size: "XL", chest: "42", length: "29" },
];

export function SizeGuide() {
  const t = useTranslations("cms");
  return (
    <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-peach text-left">
          <tr>
            <th className="p-3">{t("sizeGuide.size")}</th>
            <th className="p-3">{t("sizeGuide.chest")}</th>
            <th className="p-3">{t("sizeGuide.length")}</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((row) => (
            <tr key={row.size} className="border-t border-black/5">
              <td className="p-3 font-semibold">{row.size}</td>
              <td className="p-3">{row.chest}</td>
              <td className="p-3">{row.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="p-4 text-sm text-muted">{t("sizeGuide.note")}</p>
    </div>
  );
}
