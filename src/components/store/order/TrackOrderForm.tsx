"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { findPlacedOrder, isStoredOrder } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import {
  normalizeBdPhone,
  trackSchema,
  type TrackInput,
} from "@/lib/validation/customer";
import { translatedError } from "@/lib/validation/messages";
import type { Order } from "@/types/catalog";

type TrackOrderFormProps = {
  initialOrder?: string;
  initialPhone?: string;
};

export function TrackOrderForm({
  initialOrder = "",
  initialPhone = "",
}: TrackOrderFormProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [miss, setMiss] = useState(false);
  const t = useTranslations("orders");
  const v = useTranslations("validation");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackInput>({
    resolver: zodResolver(trackSchema),
    defaultValues: { orderId: initialOrder, phone: initialPhone },
  });

  async function onSubmit(values: TrackInput) {
    const phone = normalizeBdPhone(values.phone);
    const response = await fetch("/api/v1/orders/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: values.orderId, phone: values.phone }),
    });
    const body: unknown = await response.json().catch(() => null);
    const data =
      typeof body === "object" && body !== null && "data" in body ? body.data : null;
    if (response.ok && isStoredOrder(data)) {
      setOrder(data);
      setMiss(false);
      return;
    }
    const placed = phone ? findPlacedOrder(values.orderId, phone) : undefined;
    setOrder(placed ?? null);
    setMiss(!placed);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-lg bg-card p-5 shadow-soft"
        noValidate
      >
        <p className="text-sm text-muted">{t("trackIntro")}</p>
        <label className="mt-4 block text-sm">
          {t("fieldOrderId")}
          <input className={`${fieldClass} mt-1`} {...register("orderId")} />
          {errors.orderId ? (
            <span className="mt-1 block text-xs text-red-700">
              {translatedError(v, errors.orderId.message)}
            </span>
          ) : null}
        </label>
        <label className="mt-4 block text-sm">
          {t("fieldPhone")}
          <input className={`${fieldClass} mt-1`} {...register("phone")} />
          {errors.phone ? (
            <span className="mt-1 block text-xs text-red-700">
              {translatedError(v, errors.phone.message)}
            </span>
          ) : null}
        </label>
        <button type="submit" className={`${buttonClass("ink")} mt-4`}>
          {t("trackNow")}
        </button>
        {miss ? <p className="mt-3 text-sm text-red-700">{t("trackMiss")}</p> : null}
      </form>
      {order ? (
        <ol className="rounded-lg bg-card p-5 shadow-soft">
          {order.timeline.map((step) => (
            <li key={step.label} className="relative pb-4 pl-6 last:pb-0">
              <span
                className={`absolute top-1 left-0 h-3 w-3 rounded-full ${step.done ? "bg-primary" : "bg-black/15"}`}
              />
              <p className="text-sm font-semibold">{step.label}</p>
              {step.at ? <p className="text-xs text-muted">{step.at}</p> : null}
            </li>
          ))}
          <p className="mt-4 text-sm">
            {t("trackSummary", {
              trackingId: order.trackingId,
              total: formatTaka(order.total),
            })}
          </p>
        </ol>
      ) : null}
    </div>
  );
}
