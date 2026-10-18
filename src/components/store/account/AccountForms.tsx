"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import {
  addressSchema,
  passwordSchema,
  profileSchema,
  type AddressInput,
  type PasswordInput,
  type ProfileInput,
} from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";

type Address = {
  id: string;
  label: "HOME" | "OFFICE" | "OTHER";
  name: string;
  phone: string;
  line1: string;
  area: "inside-dhaka" | "outside-dhaka";
  city: string;
  isDefault: boolean;
};

async function readBody(response: Response): Promise<{ data?: unknown; error?: string }> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    return {};
  }
  return body as { data?: unknown; error?: string };
}

export function AddressBook() {
  const t = useTranslations("account");
  const checkout = useTranslations("checkout");
  const v = useTranslations("validation");
  const labelText: Record<Address["label"], string> = {
    HOME: t("labelHome"),
    OFFICE: t("labelOffice"),
    OTHER: t("labelOther"),
  };
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { label: "HOME", area: "inside-dhaka" },
  });

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/v1/account/addresses");
      const body = await readBody(response);
      setAddresses(Array.isArray(body.data) ? (body.data as Address[]) : []);
      setLoading(false);
    })();
  }, []);

  async function onSubmit(values: AddressInput) {
    setError("");
    const response = await fetch("/api/v1/account/addresses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await readBody(response);
    if (!response.ok) {
      setError(body.error ?? t("errorSaveAddress"));
      return;
    }
    setAddresses((current) => [...current, body.data as Address]);
    reset({
      label: "HOME",
      area: "inside-dhaka",
      name: "",
      phone: "",
      line1: "",
      city: "",
    });
  }

  async function onDelete(id: string) {
    const response = await fetch(`/api/v1/account/addresses/${id}`, { method: "DELETE" });
    if (response.ok) {
      setAddresses((current) => current.filter((address) => address.id !== id));
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{t("loadingAddresses")}</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {addresses.length === 0 ? (
          <li className="rounded-lg bg-card p-4 text-sm text-muted shadow-soft">
            {t("noAddresses")}
          </li>
        ) : null}
        {addresses.map((address) => (
          <li key={address.id} className="rounded-lg bg-card p-4 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {labelText[address.label]}
                  {address.isDefault ? (
                    <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {t("defaultBadge")}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">{address.line1}</p>
                <p className="text-sm text-muted">
                  {address.city} ·{" "}
                  {address.area === "inside-dhaka"
                    ? checkout("areaInsideDhaka")
                    : checkout("areaOutsideDhaka")}
                </p>
                <p className="text-sm text-muted">{address.phone}</p>
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-red-700"
                onClick={() => onDelete(address.id)}
              >
                {t("removeAddress")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 rounded-lg bg-card p-4 shadow-soft"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            {t("fieldLabel")}
            <select className={`${fieldClass} mt-1`} {...register("label")}>
              <option value="HOME">{t("labelHome")}</option>
              <option value="OFFICE">{t("labelOffice")}</option>
              <option value="OTHER">{t("labelOther")}</option>
            </select>
          </label>
          <label className="block text-sm">
            {t("fieldArea")}
            <select className={`${fieldClass} mt-1`} {...register("area")}>
              <option value="inside-dhaka">{checkout("areaInsideDhaka")}</option>
              <option value="outside-dhaka">{checkout("areaOutsideDhaka")}</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          {t("fieldRecipientName")}
          <input className={`${fieldClass} mt-1`} {...register("name")} />
          {errors.name ? (
            <span className="mt-1 block text-xs text-red-700">
              {translatedError(v, errors.name.message)}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          {t("fieldPhone")}
          <input className={`${fieldClass} mt-1`} {...register("phone")} />
          {errors.phone ? (
            <span className="mt-1 block text-xs text-red-700">
              {translatedError(v, errors.phone.message)}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          {t("fieldFullAddress")}
          <input className={`${fieldClass} mt-1`} {...register("line1")} />
          {errors.line1 ? (
            <span className="mt-1 block text-xs text-red-700">
              {translatedError(v, errors.line1.message)}
            </span>
          ) : null}
        </label>
        <label className="block text-sm">
          {t("fieldCity")}
          <input
            className={`${fieldClass} mt-1`}
            placeholder={t("cityPlaceholder")}
            {...register("city")}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isDefault")} />
          {t("makeDefaultCheckbox")}
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
          {isSubmitting ? t("savingAddress") : t("saveAddress")}
        </button>
      </form>
    </div>
  );
}

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
    return <p className="text-sm text-muted">{t("loadingProfile")}</p>;
  }

  return (
    <form
      className="max-w-lg space-y-3 rounded-lg bg-card p-5 shadow-soft"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <label className="block text-sm">
        {t("fieldName")}
        <input className={`${fieldClass} mt-1`} {...register("name")} />
        {errors.name ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.name.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("fieldPhone")}
        <input
          className={`${fieldClass} mt-1 bg-black/5`}
          value={phone}
          disabled
          readOnly
        />
        <span className="mt-1 block text-xs text-muted">{t("phoneImmutableNote")}</span>
      </label>
      <label className="block text-sm">
        {t("fieldEmail")}
        <input className={`${fieldClass} mt-1`} {...register("email")} />
        {errors.email ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.email.message)}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={isSubmitting}>
        {isSubmitting ? t("savingProfile") : t("saveProfile")}
      </button>
      {saved ? <p className="text-sm text-success">{t("profileSaved")}</p> : null}
    </form>
  );
}

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
      className="max-w-lg space-y-3 rounded-lg bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <label className="block text-sm">
        {t("fieldCurrentPassword")}
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.currentPassword.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("fieldNewPassword")}
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("nextPassword")}
        />
        {errors.nextPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.nextPassword.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("fieldConfirmPassword")}
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.confirmPassword.message)}
          </span>
        ) : null}
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("ink")} disabled={isSubmitting}>
        {isSubmitting ? t("updatingPassword") : t("updatePassword")}
      </button>
      {saved ? <p className="text-sm text-success">{t("passwordUpdated")}</p> : null}
    </form>
  );
}
