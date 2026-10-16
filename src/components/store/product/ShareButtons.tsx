"use client";

import { useTranslations } from "next-intl";
import { absoluteUrl } from "@/lib/seo/urls";
import { useToastStore } from "@/store/toast";

type ShareButtonsProps = {
  name: string;
  path: string;
};

export function ShareButtons({ name, path }: ShareButtonsProps) {
  const t = useTranslations("product");
  const copied = useTranslations("toast");
  const push = useToastStore((state) => state.push);

  const url = absoluteUrl(path);
  const text = `${name} ${url}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const copiedOk = document.execCommand("copy");
      field.remove();
      if (!copiedOk) return;
    }
    push(copied("copied"));
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-ink">{t("share")}</span>
      <a
        className="rounded-md border border-black/10 px-3 py-1.5 font-semibold hover:text-primary"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
      >
        {t("facebook")}
      </a>
      <a
        className="rounded-md border border-black/10 px-3 py-1.5 font-semibold hover:text-primary"
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
      >
        {t("whatsapp")}
      </a>
      <a
        className="rounded-md border border-black/10 px-3 py-1.5 font-semibold hover:text-primary"
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
      >
        {t("x")}
      </a>
      <button
        type="button"
        className="rounded-md border border-black/10 px-3 py-1.5 font-semibold"
        onClick={() => void copyLink()}
      >
        {t("copy")}
      </button>
    </div>
  );
}
