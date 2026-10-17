import Link from "next/link";
import { useTranslations } from "next-intl";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { breadcrumbJsonLd } from "@/lib/seo/schema";

export type Crumb = {
  href?: string;
  label: string;
};

type PageTitleProps = {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  showHeading?: boolean;
};

export function PageTitle({
  title,
  subtitle,
  crumbs = [],
  showHeading = true,
}: PageTitleProps) {
  const t = useTranslations("common");
  return (
    <div className="bg-peach">
      <Container className="py-8">
        {crumbs.length > 0 ? (
          <nav aria-label={t("breadcrumbAria")} className="mb-3">
            <JsonLd data={breadcrumbJsonLd(crumbs)} />
            <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {crumb.href && !last ? (
                      <Link href={crumb.href} className="hover:text-primary">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground">{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        {showHeading ? (
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        ) : null}
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>
        ) : null}
      </Container>
    </div>
  );
}
