import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { siteConfig, type SiteLink, type SocialName } from "@/config/site";
import { Container } from "@/components/ui/Container";
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from "@/components/store/layout/icons";
import { Logo } from "@/components/store/layout/Logo";
import { NewsletterForm } from "@/components/store/layout/NewsletterForm";

const socialIcons: Record<SocialName, ReactNode> = {
  Facebook: <FacebookIcon />,
  Instagram: <InstagramIcon />,
  YouTube: <YouTubeIcon />,
  WhatsApp: <WhatsAppIcon />,
};

function FooterLinks({ title, links }: { title: string; links: SiteLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const brandColors: Record<string, string> = {
  bKash: "#E2136E",
  Nagad: "#F7941D",
  Rocket: "#8C3494",
  Visa: "#1A1F71",
  Mastercard: "#EB001B",
  Amex: "#2E77BB",
  COD: "#1F7A0F",
  Pathao: "#E4452C",
  Steadfast: "#0B5ED7",
  RedX: "#ED1C24",
  iEX: "#0F9D58",
};

function BrandRow({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const color = brandColors[item] ?? "#374151";
          return (
            <li
              key={item}
              style={{ borderLeftColor: color }}
              className="flex h-9 items-center rounded-md border border-black/10 border-l-[3px] bg-white px-3 text-xs font-bold shadow-soft"
            >
              <span style={{ color }}>{item}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export async function Footer({
  name = siteConfig.name,
  description = siteConfig.description,
  logoUrl = "",
  phone = siteConfig.contact.phoneDisplay,
  email = siteConfig.contact.email,
  address = siteConfig.contact.address,
  hours = "",
  social = siteConfig.socialLinks,
}: {
  name?: string;
  description?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
  social?: { label: SocialName; href: string }[];
}) {
  const year = new Date().getFullYear();
  const t = await getTranslations("footer");
  const links = await getTranslations("links");
  const customerLinks = siteConfig.customerServiceLinks.map((link) => ({
    ...link,
    label: links(link.id),
  }));
  const useful = siteConfig.usefulLinks.map((link) => ({
    ...link,
    label: links(link.id),
  }));

  return (
    <footer className="mt-auto border-t border-black/5 bg-card">
      <Container className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo name={name} logoUrl={logoUrl} />
          <p className="mt-4 text-sm leading-6 text-muted">{description}</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            <li className="flex items-center gap-2">
              <PinIcon className="text-primary" />
              {address}
            </li>
            {hours ? <li>{hours}</li> : null}
            <li>
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <PhoneIcon className="text-primary" />
                {phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 hover:text-primary"
              >
                <MailIcon className="text-primary" />
                {email}
              </a>
            </li>
          </ul>
        </div>

        <FooterLinks title={t("customerService")} links={customerLinks} />
        <FooterLinks title={t("usefulLinks")} links={useful} />

        <div>
          <h2 id="newsletter" className="scroll-mt-24 text-sm font-semibold text-ink">
            {t("newsletter")}
          </h2>
          <p className="mt-3 text-sm text-muted">{t("newsletterText")}</p>
          <NewsletterForm />

          <h2 className="mt-6 text-sm font-semibold text-ink">{t("download")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-muted">
              Google Play
            </span>
            <span className="rounded-md border border-black/10 px-3 py-2 text-xs font-semibold text-muted">
              App Store
            </span>
          </div>

          <h2 className="mt-6 text-sm font-semibold text-ink">{t("follow")}</h2>
          <ul className="mt-3 flex gap-2">
            {social.map((link) => (
              <li key={link.label}>
                {link.href && link.href !== "#" ? (
                  <a
                    href={link.href}
                    className="grid h-9 w-9 place-items-center rounded-md border border-black/10 text-ink"
                    title={link.label}
                  >
                    {socialIcons[link.label]}
                    <span className="sr-only">{link.label}</span>
                  </a>
                ) : (
                  <span
                    className="grid h-9 w-9 place-items-center rounded-md border border-black/10 text-ink"
                    title={link.label}
                  >
                    {socialIcons[link.label]}
                    <span className="sr-only">{link.label}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="grid gap-6 border-t border-black/5 py-6 sm:grid-cols-2">
        <BrandRow title={t("accept")} items={siteConfig.paymentMethods} />
        <BrandRow title={t("delivery")} items={siteConfig.deliveryPartners} />
      </Container>

      <div className="bg-ink text-white">
        <Container className="py-3 text-center text-xs sm:text-sm">
          © {year} {name}. {t("rights")}
        </Container>
      </div>
    </footer>
  );
}
