"use client";

import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { track } from "@/lib/tracking/browser";
import { MessengerIcon, WhatsAppIcon } from "@/components/store/layout/icons";

export function ChatButtons({
  messenger = siteConfig.chat.messenger,
  whatsapp = siteConfig.chat.whatsapp,
}: {
  messenger?: string;
  whatsapp?: string;
}) {
  const t = useTranslations("chat");

  return (
    <div className="fixed right-4 bottom-36 z-30 flex flex-col gap-2 md:bottom-24">
      <a
        href={messenger}
        target="_blank"
        rel="noreferrer"
        aria-label={t("messenger")}
        className="grid h-12 w-12 place-items-center rounded-full bg-[#0084FF] text-white shadow-soft transition-transform hover:scale-110 active:scale-95"
      >
        <MessengerIcon size={24} />
      </a>
      <a
        href={whatsapp}
        onClick={() => track("Lead", { channel: "whatsapp" })}
        target="_blank"
        rel="noreferrer"
        aria-label={t("whatsapp")}
        className="grid h-12 w-12 place-items-center rounded-full bg-whatsapp text-white shadow-soft transition-transform hover:scale-110 active:scale-95"
      >
        <WhatsAppIcon size={24} />
      </a>
    </div>
  );
}
