import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import type { PaymentMethod } from "@/types/catalog";

export type PaymentChoice = {
  value: PaymentMethod;
  label: string;
  hint: string;
  icon: ReactNode;
};

const iconClass = "size-5";

/** Display data (label, one-line hint, icon) for each checkout payment method. */
export function usePaymentChoices(): PaymentChoice[] {
  const t = useTranslations("checkout");
  const wallet = (name: string) => t("paymentWalletHint", { name });
  return [
    {
      value: "cod",
      label: t("paymentCod"),
      hint: t("paymentCodHint"),
      icon: <Banknote className={iconClass} />,
    },
    {
      value: "bkash",
      label: t("paymentBkash"),
      hint: wallet(t("paymentBkash")),
      icon: <Smartphone className={iconClass} />,
    },
    {
      value: "nagad",
      label: t("paymentNagad"),
      hint: wallet(t("paymentNagad")),
      icon: <Smartphone className={iconClass} />,
    },
    {
      value: "rocket",
      label: t("paymentRocket"),
      hint: wallet(t("paymentRocket")),
      icon: <Smartphone className={iconClass} />,
    },
    {
      value: "card",
      label: t("paymentCard"),
      hint: t("paymentCardHint"),
      icon: <CreditCard className={iconClass} />,
    },
  ];
}
