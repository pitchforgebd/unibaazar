"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MapPin, Truck } from "lucide-react";
import { CaptchaField } from "@/components/store/auth/CaptchaField";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { FieldError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { useCheckoutQuote, type CheckoutQuote } from "@/lib/catalog/useCheckoutQuote";
import { track } from "@/lib/tracking/browser";
import { readFbclidCookies } from "@/lib/tracking/fbclid";
import { readUtm } from "@/lib/tracking/utm";
import { isStoredOrder, savePlacedOrder } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import {
  checkoutSchema,
  normalizeBdPhone,
  type CheckoutInput,
} from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import { useCartStore } from "@/store/cart";
import { CheckoutSummary } from "./CheckoutSummary";
import { ChoiceCard, choiceRadioClass } from "./ChoiceCard";
import { usePaymentChoices } from "./usePaymentChoices";

const iconClass = "size-5";

export function CheckoutForm({ codEnabled = true }: { codEnabled?: boolean }) {
  const router = useRouter();
  const t = useTranslations("checkout");
  const shop = useTranslations("shop");
  const v = useTranslations("validation");
  const payments = usePaymentChoices();
  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const reservationToken = useCartStore((state) => state.reservationToken);
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
  // Line items (name/qty/unit price) come from the already-loaded product
  // catalog — no round trip needed for those. Subtotal/discount/delivery/
  // total come from the live quote below instead, the same endpoint that
  // will actually be re-quoted at order placement, so this page can never
  // show a total the server then charges something different for.
  const summary = summarizeCart(lines, couponDiscount, catalog);
  const quoteState = useCheckoutQuote(lines, couponCode, area, reservationToken);
  const liveQuote = quoteState.byArea[area];

  const chargeLabel = (quote: CheckoutQuote | undefined) =>
    quote
      ? quote.deliveryCharge === 0
        ? t("deliveryFree")
        : formatTaka(quote.deliveryCharge)
      : "…";

  if (summary.resolved.length === 0) {
    return (
      <div className="rounded-theme bg-card p-8 text-center shadow-soft">
        <p className="font-heading font-semibold text-ink">{t("emptyCart")}</p>
        <Link href="/shop" className={buttonStyles({ className: "mt-4" })}>
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
        reservationToken: state.reservationToken,
        ...readUtm(),
        ...readFbclidCookies(),
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
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={handleSubmit(placeOrder)}
      noValidate
    >
      <div className="space-y-6 rounded-theme bg-card p-4 shadow-soft sm:p-6">
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-ink">
            {t("deliveryDetailsHeading")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t("fieldName")}
              autoComplete="name"
              required
              error={translatedError(v, errors.name?.message)}
              {...register("name")}
            />
            <Input
              label={t("fieldPhone")}
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder={t("phonePlaceholder")}
              error={translatedError(v, errors.phone?.message)}
              {...register("phone")}
            />
          </div>
          <Input
            label={t("fieldEmailOptional")}
            type="email"
            autoComplete="email"
            error={translatedError(v, errors.email?.message)}
            {...register("email")}
          />
          <Textarea
            label={t("fieldAddress")}
            autoComplete="street-address"
            required
            rows={4}
            error={translatedError(v, errors.address?.message)}
            {...register("address")}
          />
        </section>
        <fieldset className="space-y-2">
          <legend className="font-heading text-lg font-semibold text-ink">
            {t("deliveryAreaLegend")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              control={
                <input
                  type="radio"
                  value="inside-dhaka"
                  className={choiceRadioClass}
                  {...register("area")}
                />
              }
              icon={<MapPin className={iconClass} />}
              title={t("areaInsideDhaka")}
              trailing={chargeLabel(quoteState.byArea["inside-dhaka"])}
            />
            <ChoiceCard
              control={
                <input
                  type="radio"
                  value="outside-dhaka"
                  className={choiceRadioClass}
                  {...register("area")}
                />
              }
              icon={<Truck className={iconClass} />}
              title={t("areaOutsideDhaka")}
              trailing={chargeLabel(quoteState.byArea["outside-dhaka"])}
            />
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="font-heading text-lg font-semibold text-ink">
            {t("paymentMethodLegend")}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {payments
              .filter((method) => codEnabled || method.value !== "cod")
              .map((method) => (
                <ChoiceCard
                  key={method.value}
                  control={
                    <input
                      type="radio"
                      value={method.value}
                      className={choiceRadioClass}
                      {...register("paymentMethod")}
                    />
                  }
                  icon={method.icon}
                  title={method.label}
                  description={method.hint}
                />
              ))}
          </div>
        </fieldset>
        <CaptchaField onToken={(token) => setValue("captchaToken", token)} />
        {formError ? (
          <div role="alert">
            <FieldError>{formError}</FieldError>
          </div>
        ) : null}
      </div>
      <CheckoutSummary
        items={summary.resolved}
        subtotal={formatTaka(liveQuote?.subtotal ?? summary.subtotal)}
        discount={formatTaka(liveQuote?.discount ?? summary.discount)}
        delivery={chargeLabel(liveQuote)}
        total={liveQuote ? formatTaka(liveQuote.total) : "…"}
        error={quoteState.error}
      >
        <Button
          type="submit"
          size="lg"
          className="mt-4 w-full"
          isLoading={isSubmitting}
          loadingLabel={t("submitting")}
          disabled={
            isSubmitting || quoteState.loading || !liveQuote || !!quoteState.error
          }
        >
          {t("submit")}
        </Button>
      </CheckoutSummary>
    </form>
  );
}
