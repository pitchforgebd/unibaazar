"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { passwordSchema, type PasswordInput } from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { readBody } from "./readBody";

export function PasswordForm() {
  const t = useTranslations("account");
  const v = useTranslations("validation");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordSchema) });

  async function onSubmit(values: PasswordInput) {
    setError("");
    setSaved(false);
    const response = await fetch("/api/v1/account/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? t("errorUpdatePassword"));
      return;
    }
    setSaved(true);
    reset();
  }

  return (
    <form
      className="max-w-lg space-y-4 rounded-theme bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <Input
        label={t("fieldCurrentPassword")}
        type="password"
        autoComplete="current-password"
        error={translatedError(v, errors.currentPassword?.message)}
        {...register("currentPassword")}
      />
      <Input
        label={t("fieldNewPassword")}
        type="password"
        autoComplete="new-password"
        error={translatedError(v, errors.nextPassword?.message)}
        {...register("nextPassword")}
      />
      <Input
        label={t("fieldConfirmPassword")}
        type="password"
        autoComplete="new-password"
        error={translatedError(v, errors.confirmPassword?.message)}
        {...register("confirmPassword")}
      />
      {error ? (
        <div role="alert">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("updatingPassword") : t("updatePassword")}
        </Button>
        <p role="status" className="flex items-center gap-1.5 text-sm text-foreground">
          {saved ? (
            <>
              <CircleCheck aria-hidden="true" className="size-4 text-success" />
              {t("passwordUpdated")}
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
