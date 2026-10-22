import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import { formatTaka } from "@/lib/utils/currency";
import { Container } from "@/components/ui/Container";
import { LanguageToggle } from "@/components/store/layout/LanguageToggle";
import { TruckIcon } from "@/components/store/layout/icons";

export async function TopBar({
  freeFrom = siteConfig.freeShippingThreshold,
  color = "#E64A00",
}: {
  freeFrom?: number;
  color?: string;
}) {
  const t = await getTranslations("common");
  const links = await getTranslations("links");
  const nav = await getTranslations("nav");

  return (
    <div className="text-white" style={{ backgroundColor: color }}>
      <Container className="flex h-9 items-center justify-between gap-4 text-xs sm:text-sm">
        <p className="flex min-w-0 flex-1 items-center gap-2 font-medium">
          <TruckIcon className="hidden sm:block" />
          <span className="truncate">
            {t("freeDelivery", { amount: formatTaka(freeFrom) })}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <nav className="hidden items-center lg:flex" aria-label={nav("quickLinks")}>
            {siteConfig.topBarLinks.map((link, index) => (
              <span key={link.id} className="flex items-center">
                {index > 0 ? (
                  <span aria-hidden="true" className="px-3 text-white/50">
                    |
                  </span>
                ) : null}
                <Link
                  href={link.href}
                  className="whitespace-nowrap hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {links(link.id)}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </Container>
    </div>
  );
}
