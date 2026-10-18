"use client";

import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CaptchaField } from "@/components/store/auth/CaptchaField";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { track } from "@/lib/tracking/browser";
import { readUtm } from "@/lib/tracking/utm";
import { deliveryCharges, variantLabel } from "@/lib/catalog/pricing";
import { isStoredOrder, savePlacedOrder } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import {
  checkoutSchema,
  normalizeBdPhone,
  type CheckoutInput,
} from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { useCartStore } from "@/store/cart";
import type { PaymentMethod } from "@/types/catalog";

export function CheckoutForm({ codEnabled = true }: { codEnabled?: boolean }) {
  const router = useRouter();
  const t = useTranslations("checkout");
  const shop = useTranslations("shop");
  const v = useTranslations("validation");
  const payments: { value: PaymentMethod; label: string }[] = [
    { value: "cod", label: t("paymentCod") },
    { value: "bkash", label: t("paymentBkash") },
    { value: "nagad", label: t("paymentNagad") },
    { value: "rocket", label: t("paymentRocket") },
    { value: "card", label: t("paymentCard") },
  ];
  const lines = useCartStore((state) => state.lines);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const clear = useCartStore((state) => state.clear);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      area: "inside-dhaka",
      paymentMethod: codEnabled ? "cod" : "bkash",
    },
  });

  const area = watch("area");
  const { catalog } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog, area);

  if (summary.resolved.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-soft">
        <p className="font-semibold">{t("emptyCart")}</p>
        <Link href="/shop" className={`${buttonClass("primary")} mt-4`}>
          {shop("browseProducts")}
        </Link>
      </div>
    );
  }

  async function placeOrder(values: CheckoutInput) {
    setFormError(null);
    const phone = normalizeBdPhone(values.phone);
    if (!phone) {
      setFormError("Enter a valid Bangladeshi mobile number");
      return;
    }
    track("AddPaymentInfo", { method: values.paymentMethod });
    const state = useCartStore.getState();
    const response = await fetch("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        phone,
        lines: state.lines,
        couponCode: state.couponCode || undefined,
        ...readUtm(),
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    const record = typeof body === "object" && body !== null ? body : {};
    if (!response.ok) {
      const message =
        "error" in record && typeof record.error === "string"
          ? record.error
          : t("errorPlaceOrder");
      setFormError(message);
      return;
    }
    const order = "data" in record ? record.data : null;
    if (!isStoredOrder(order)) {
      setFormError(t("errorPlaceOrder"));
      return;
    }
    savePlacedOrder(order);
    clear();
    if (values.paymentMethod === "cod") {
      router.push(`/order-success/${order.id}`);
      return;
    }
    const gateway = await fetch("/api/v1/payments/initiate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderNumber: order.id, phone }),
    });
    const gatewayBody: unknown = await gateway.json().catch(() => null);
    const gatewayRecord =
      typeof gatewayBody === "object" && gatewayBody !== null ? gatewayBody : {};
    const gatewayData = "data" in gatewayRecord ? gatewayRecord.data : null;
    const redirectUrl =
      gateway.ok &&
      typeof gatewayData === "object" &&
      gatewayData !== null &&
      "redirectUrl" in gatewayData &&
      typeof gatewayData.redirectUrl === "string"
        ? gatewayData.redirectUrl
        : null;
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }
    router.push(`/order-success/${order.id}`);
  }

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
      onSubmit={handleSubmit(placeOrder)}
      noValidate
    >
      <div className="space-y-4 rounded-lg bg-card p-4 shadow-soft sm:p-6">
        <h2 className="font-semibold text-ink">{t("deliveryDetailsHeading")}</h2>
        <Field label={t("fieldName")} error={translatedError(v, errors.name?.message)}>
          <input className={fieldClass} {...register("name")} />
        </Field>
        <Field label={t("fieldPhone")} error={translatedError(v, errors.phone?.message)}>
          <input
            className={fieldClass}
            inputMode="tel"
            placeholder={t("phonePlaceholder")}
            {...register("phone")}
          />
        </Field>
        <Field
          label={t("fieldEmailOptional")}
          error={translatedError(v, errors.email?.message)}
        >
          <input className={fieldClass} type="email" {...register("email")} />
        </Field>
        <Field
          label={t("fieldAddress")}
          error={translatedError(v, errors.address?.message)}
        >
          <textarea
            rows={4}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm outline-none focus:border-primary"
            {...register("address")}
          />
        </Field>
        <fieldset>
          <legend className="text-sm font-semibold">{t("deliveryAreaLegend")}</legend>
          <div className="mt-2 space-y-2 text-sm">
            <label className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2">
              <span>
                <input type="radio" value="inside-dhaka" {...register("area")} />{" "}
                {t("areaInsideDhaka")}
              </span>
              <span>{formatTaka(deliveryCharges["inside-dhaka"])}</span>
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-3 py-2">
              <span>
                <input type="radio" value="outside-dhaka" {...register("area")} />{" "}
                {t("areaOutsideDhaka")}
              </span>
              <span>{formatTaka(deliveryCharges["outside-dhaka"])}</span>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">{t("paymentMethodLegend")}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {payments
              .filter((method) => codEnabled || method.value !== "cod")
              .map((method) => (
                <label
                  key={method.value}
                  className="flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    value={method.value}
                    {...register("paymentMethod")}
                  />
                  {method.label}
                </label>
              ))}
          </div>
        </fieldset>
        <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
        {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
      </div>
      <aside className="h-fit rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">{t("orderSummaryHeading")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {summary.resolved.map((item) => (
            <li key={item.variant.id} className="flex justify-between gap-3">
              <span>
                {item.product.name}
                {item.label ? ` (${variantLabel(item.variant)})` : ""} × {item.line.qty}
              </span>
              <span>{formatTaka(item.unitPrice * item.line.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-black/5 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{t("subtotal")}</dt>
            <dd>{formatTaka(summary.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("discount")}</dt>
            <dd>-{formatTaka(summary.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("delivery")}</dt>
            <dd>
              {summary.shipping === 0
                ? t("deliveryFree")
                : formatTaka(summary.shipping ?? 0)}
            </dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>{t("total")}</dt>
            <dd>{formatTaka(summary.total)}</dd>
          </div>
        </dl>
        <button
          type="submit"
          className={`${buttonClass("primary")} mt-4 w-full`}
          disabled={isSubmitting}
        >
          {t("submit")}
        </button>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
