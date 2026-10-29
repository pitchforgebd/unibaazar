import { BadgeCheck, CreditCard, Headset, Truck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Stagger, StaggerItem } from "@/components/motion";

export function TrustStrip() {
  const t = useTranslations("home");
  const items: { icon: LucideIcon; title: string; text: string }[] = [
    {
      icon: Truck,
      title: t("trustFastDeliveryTitle"),
      text: t("trustFastDeliveryText"),
    },
    {
      icon: BadgeCheck,
      title: t("trustAuthorizedTitle"),
      text: t("trustAuthorizedText"),
    },
    { icon: Headset, title: t("trustSupportTitle"), text: t("trustSupportText") },
    { icon: CreditCard, title: t("trustPaymentsTitle"), text: t("trustPaymentsText") },
  ];

  return (
    <Stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ icon: Icon, title, text }) => (
        <StaggerItem
          key={title}
          className="flex h-full items-start gap-3 rounded-theme bg-card p-4 shadow-soft"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-peach text-ink">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="font-heading font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
