"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { profileSchema, type ProfileInput } from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { readBody } from "./readBody";

export function ProfileForm() {
  const t = useTranslations("account");
  const v = useTranslations("validation");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/auth/me");
      const body = await readBody(response);
      const profile = body.data as
        { name?: string; phone?: string; email?: string } | undefined;
      if (profile) {
        reset({ name: profile.name ?? "", email: profile.email ?? "" });
        setPhone(profile.phone ?? "");
      }
      setLoading(false);
    })();
  }, [reset]);

  async function onSubmit(values: ProfileInput) {
    setError("");
    setSaved(false);
    const response = await fetch("/api/v1/account/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? t("errorSaveProfile"));
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <Spinner />
        {t("loadingProfile")}
      </p>
    );
  }

  return (
    <form
      className="max-w-lg space-y-4 rounded-theme bg-card p-5 shadow-soft"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <Input
        label={t("fieldName")}
        autoComplete="name"
        error={translatedError(v, errors.name?.message)}
        {...register("name")}
      />
      <Input
        label={t("fieldPhone")}
        hint={t("phoneImmutableNote")}
        value={phone}
        disabled
        readOnly
      />
      <Input
        label={t("fieldEmail")}
        type="email"
        autoComplete="email"
        error={translatedError(v, errors.email?.message)}
        {...register("email")}
      />
      {error ? (
        <div role="alert">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("savingProfile") : t("saveProfile")}
        </Button>
        <p role="status" className="flex items-center gap-1.5 text-sm text-foreground">
          {saved ? (
            <>
              <CircleCheck aria-hidden="true" className="size-4 text-success" />
              {t("profileSaved")}
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
