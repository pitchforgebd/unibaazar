import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { PageTitle, type Crumb } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { activeFilterCount } from "@/components/store/shop/activeFilters";
import { FilterForm, type ShopTranslator } from "@/components/store/shop/FilterForm";
import { MobileFilters } from "@/components/store/shop/MobileFilters";
import { SortSelect } from "@/components/store/shop/SortSelect";
import { sanitizeRichText } from "@/lib/security/sanitizeHtml";
import {
  facetValues,
  filterProducts,
  pageSize,
  paginateProducts,
  shopHref,
} from "@/lib/catalog/queries";
import {
  listStoreBrands,
  listStoreCategories,
  listStoreProducts,
} from "@/server/catalog/products";
import type { ShopQuery } from "@/types/catalog";

type ProductListingProps = {
  title: string;
  subtitle?: string;
  crumbs: Crumb[];
  basePath: string;
  query: ShopQuery;
  categorySlug?: string;
  brandSlug?: string;
  seoText?: string;
  hideCategory?: boolean;
  hideBrand?: boolean;
};

const MOBILE_FORM_ID = "listing-filters-mobile";

export async function ProductListing({
  title,
  subtitle,
  crumbs,
  basePath,
  query,
  categorySlug,
  brandSlug,
  seoText,
  hideCategory = false,
  hideBrand = false,
}: ProductListingProps) {
  const t = await getTranslations("shop");
  const [catalog, categories, brands] = await Promise.all([
    listStoreProducts(),
    listStoreCategories(),
    listStoreBrands(),
  ]);
  const filtered = filterProducts(query, { categorySlug, brandSlug }, catalog);
  const page = paginateProducts(filtered, query.page);
  const facets = facetValues(catalog);
  const start = page.total === 0 ? 0 : (page.page - 1) * pageSize + 1;
  const end = Math.min(page.page * pageSize, page.total);
  // The filter inputs are uncontrolled (defaultChecked/defaultValue), so a
  // client-side navigation — "Clear", a sort change — would otherwise leave
  // them (and an open mobile sheet) showing the previous URL's state.
  // Keying on the current URL remounts them whenever it changes.
  const urlKey = shopHref(basePath, query);
  const formProps = {
    t,
    basePath,
    query,
    categories,
    brands,
    facets,
    hideCategory,
    hideBrand,
  };

  return (
    <>
      <PageTitle title={title} subtitle={subtitle} crumbs={crumbs} />
      <Container className="grid gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
        {/* Desktop: a sidebar that stays in view below the sticky header
         * while the grid scrolls. Below lg it's display:none and the same
         * form opens in MobileFilters' bottom sheet instead. */}
        <div className="hidden rounded-theme bg-card p-5 shadow-soft lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto">
          <h2 className="mb-4 font-heading text-base font-semibold text-ink">
            {t("filtersTitle")}
          </h2>
          <FilterForm
            key={urlKey}
            id="listing-filters-desktop"
            withActions
            {...formProps}
          />
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {page.total === 0
                ? t("noProducts")
                : t("showingRange", { start, end, total: page.total })}
            </p>
            <div className="flex items-center gap-2">
              <MobileFilters
                key={urlKey}
                activeCount={activeFilterCount(query)}
                footer={
                  <>
                    <Link
                      href={basePath}
                      className={buttonStyles({ variant: "outline" })}
                    >
                      {t("clear")}
                    </Link>
                    <Button type="submit" form={MOBILE_FORM_ID}>
                      {t("apply")}
                    </Button>
                  </>
                }
              >
                <FilterForm id={MOBILE_FORM_ID} withActions={false} {...formProps} />
              </MobileFilters>
              <SortSelect basePath={basePath} query={query} />
            </div>
          </div>
          {page.items.length === 0 ? (
            <div className="rounded-theme bg-card p-8 text-center shadow-soft">
              <p className="font-semibold text-ink">{t("noMatches")}</p>
              <Link
                href={basePath}
                className={buttonStyles({ variant: "outline", className: "mt-4" })}
              >
                {t("clearFilters")}
              </Link>
            </div>
          ) : (
            <ProductGrid products={page.items} reveal />
          )}
          <Pagination
            t={t}
            basePath={basePath}
            query={query}
            page={page.page}
            pageCount={page.pageCount}
          />
          {seoText ? (
            <section className="mt-8 rounded-theme bg-card p-5 shadow-soft">
              <h2 className="font-heading text-lg font-semibold text-ink">
                {t("aboutCategory")}
              </h2>
              <div
                className="prose-sm mt-2 max-w-none text-sm leading-6 text-muted [&_a]:text-primary [&_a]:underline [&_strong]:text-ink"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(seoText) }}
              />
            </section>
          ) : null}
        </div>
      </Container>
    </>
  );
}

function Pagination({
  t,
  basePath,
  query,
  page,
  pageCount,
}: {
  t: ShopTranslator;
  basePath: string;
  query: ShopQuery;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) {
    return null;
  }
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <nav aria-label={t("paginationAria")} className="mt-8 flex flex-wrap gap-2">
      {pages.map((number) => (
        <Link
          key={number}
          href={shopHref(basePath, query, { page: number })}
          aria-current={number === page ? "page" : undefined}
          className={buttonStyles({
            variant: number === page ? "primary" : "outline",
            iconOnly: true,
          })}
        >
          {number}
        </Link>
      ))}
    </nav>
  );
}
