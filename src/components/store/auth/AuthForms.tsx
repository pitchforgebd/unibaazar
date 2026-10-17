"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CaptchaField } from "@/components/store/auth/CaptchaField";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { track } from "@/lib/tracking/browser";
import { syncCartOnLogin } from "@/lib/cart/sync";
import {
  forgotSchema,
  loginSchema,
  registerSchema,
  type ForgotInput,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { useCartStore } from "@/store/cart";

export function LoginForm({
  initialNeeds2fa = false,
}: { initialNeeds2fa?: boolean } = {}) {
  const router = useRouter();
  const t = useTranslations("auth");
  const v = useTranslations("validation");
  const [formError, setFormError] = useState<string | null>(null);
  const [needs2fa, setNeeds2fa] = useState(initialNeeds2fa);
  const [otpCode, setOtpCode] = useState("");
  const [otpPending, setOtpPending] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function finishLogin(body: unknown) {
    const { lines, couponCode } = useCartStore.getState();
    syncCartOnLogin({ lines, couponCode });
    const data =
      typeof body === "object" &&
      body &&
      "data" in body &&
      typeof body.data === "object" &&
      body.data
        ? body.data
        : null;
    const role =
      data && "role" in data && typeof data.role === "string" ? data.role : "customer";
    router.push(role === "customer" ? "/account" : "/admin");
    router.refresh();
  }

  if (needs2fa) {
    return (
      <form
        className="mx-auto max-w-md rounded-lg bg-card p-5 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          setFormError(null);
          setOtpPending(true);
          try {
            const response = await fetch("/api/v1/auth/2fa/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ code: otpCode }),
            });
            const body: unknown = await response.json().catch(() => null);
            if (!response.ok) {
              const message =
                typeof body === "object" &&
                body &&
                "error" in body &&
                typeof body.error === "string"
                  ? body.error
                  : t("errorVerifyCode");
              setFormError(message);
              return;
            }
            await finishLogin(body);
          } finally {
            setOtpPending(false);
          }
        }}
      >
        <h2 className="text-lg font-semibold text-ink">{t("twoFaHeading")}</h2>
        <p className="mt-1 text-sm text-muted">{t("twoFaIntro")}</p>
        <label className="mt-4 block text-sm">
          {t("fieldCode")}
          <input
            className={`${fieldClass} mt-1`}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otpCode}
            onChange={(event) => setOtpCode(event.target.value)}
            required
          />
        </label>
        {formError ? <p className="mt-3 text-sm text-red-700">{formError}</p> : null}
        <button
          type="submit"
          className={`${buttonClass("primary")} mt-4 w-full`}
          disabled={otpPending}
        >
          {t("verifyAndContinue")}
        </button>
        <button
          type="button"
          className="mt-3 w-full text-sm font-semibold text-primary"
          onClick={() => {
            setNeeds2fa(false);
            setOtpCode("");
            setFormError(null);
          }}
        >
          {t("backToLogin")}
        </button>
      </form>
    );
  }

  return (
    <form
      className="mx-auto max-w-md rounded-lg bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof body === "object" &&
            body &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : t("errorSignIn");
          setFormError(message);
          return;
        }
        const data =
          typeof body === "object" &&
          body &&
          "data" in body &&
          typeof body.data === "object" &&
          body.data
            ? body.data
            : null;
        if (data && "requires2fa" in data && data.requires2fa === true) {
          setNeeds2fa(true);
          return;
        }
        await finishLogin(body);
      })}
    >
      <label className="block text-sm">
        {t("fieldPhoneOrEmail")}
        <input className={`${fieldClass} mt-1`} {...register("identity")} />
        {errors.identity ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.identity.message)}
          </span>
        ) : null}
      </label>
      <label className="mt-4 block text-sm">
        {t("fieldPassword")}
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("password")}
        />
        {errors.password ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.password.message)}
          </span>
        ) : null}
      </label>
      <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
      {formError ? <p className="mt-3 text-sm text-red-700">{formError}</p> : null}
      <button
        type="submit"
        className={`${buttonClass("primary")} mt-4 w-full`}
        disabled={isSubmitting}
      >
        {t("submitLogin")}
      </button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const v = useTranslations("validation");
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      className="mx-auto max-w-md space-y-4 rounded-lg bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFormError(null);
        const response = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            typeof body === "object" &&
            body &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : t("errorCreateAccount");
          setFormError(message);
          return;
        }
        track("CompleteRegistration");
        router.push("/account");
        router.refresh();
      })}
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
        <input className={`${fieldClass} mt-1`} {...register("phone")} />
        {errors.phone ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.phone.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("fieldEmailOptional")}
        <input className={`${fieldClass} mt-1`} {...register("email")} />
        {errors.email ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.email.message)}
          </span>
        ) : null}
      </label>
      <label className="block text-sm">
        {t("fieldPassword")}
        <input
          type="password"
          className={`${fieldClass} mt-1`}
          {...register("password")}
        />
        {errors.password ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.password.message)}
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
      <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
      {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      <button
        type="submit"
        className={`${buttonClass("primary")} w-full`}
        disabled={isSubmitting}
      >
        {t("submitRegister")}
      </button>
    </form>
  );
}

export function ForgotForm() {
  const t = useTranslations("auth");
  const v = useTranslations("validation");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) });

  if (previewCode) {
    return (
      <form
        className="mx-auto max-w-md space-y-4 rounded-lg bg-card p-5 shadow-soft"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const response = await fetch("/api/v1/auth/reset", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              identity: getValues("identity"),
              code: String(form.get("code") ?? ""),
              password: String(form.get("password") ?? ""),
            }),
          });
          const body: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            const message =
              typeof body === "object" &&
              body &&
              "error" in body &&
              typeof body.error === "string"
                ? body.error
                : t("errorResetPassword");
            setResetMessage(message);
            return;
          }
          setResetMessage(t("resetSuccess"));
        }}
      >
        <p className="text-sm text-muted">
          {t("resetCodeNotice")}
          <span className="font-semibold text-ink">{previewCode}</span>
        </p>
        <label className="block text-sm">
          {t("fieldCode")}
          <input
            name="code"
            className={`${fieldClass} mt-1`}
            defaultValue={previewCode}
          />
        </label>
        <label className="block text-sm">
          {t("fieldNewPassword")}
          <input
            name="password"
            type="password"
            className={`${fieldClass} mt-1`}
            minLength={6}
            required
          />
        </label>
        {resetMessage ? <p className="text-sm text-ink">{resetMessage}</p> : null}
        <button type="submit" className={`${buttonClass("ink")} w-full`}>
          {t("submitUpdatePassword")}
        </button>
      </form>
    );
  }

  return (
    <form
      className="mx-auto max-w-md rounded-lg bg-card p-5 shadow-soft"
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const response = await fetch("/api/v1/auth/forgot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        const body: unknown = await response.json().catch(() => null);
        const data =
          typeof body === "object" &&
          body &&
          "data" in body &&
          typeof body.data === "object" &&
          body.data
            ? body.data
            : null;
        const code =
          data && "previewCode" in data && typeof data.previewCode === "string"
            ? data.previewCode
            : null;
        setPreviewCode(code ?? "Check your messages");
      })}
    >
      <label className="block text-sm">
        {t("fieldPhoneOrEmail")}
        <input className={`${fieldClass} mt-1`} {...register("identity")} />
        {errors.identity ? (
          <span className="mt-1 block text-xs text-red-700">
            {translatedError(v, errors.identity.message)}
          </span>
        ) : null}
      </label>
      <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
      <button
        type="submit"
        className={`${buttonClass("ink")} mt-4`}
        disabled={isSubmitting}
      >
        {t("submitSendResetCode")}
      </button>
    </form>
  );
}
