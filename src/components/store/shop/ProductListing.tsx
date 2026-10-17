import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { PageTitle, type Crumb } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
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

  return (
    <>
      <PageTitle title={title} subtitle={subtitle} crumbs={crumbs} />
      <Container className="grid gap-6 py-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <FilterForm
          t={t}
          basePath={basePath}
          query={query}
          categories={categories}
          brands={brands}
          facets={facets}
          hideCategory={hideCategory}
          hideBrand={hideBrand}
        />
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {page.total === 0
                ? t("noProducts")
                : t("showingRange", { start, end, total: page.total })}
            </p>
            <SortSelect basePath={basePath} query={query} />
          </div>
          {page.items.length === 0 ? (
            <div className="rounded-lg bg-card p-8 text-center shadow-soft">
              <p className="font-semibold text-ink">{t("noMatches")}</p>
              <Link href={basePath} className={`${buttonClass("outline")} mt-4`}>
                {t("clearFilters")}
              </Link>
            </div>
          ) : (
            <ProductGrid products={page.items} />
          )}
          <Pagination
            t={t}
            basePath={basePath}
            query={query}
            page={page.page}
            pageCount={page.pageCount}
          />
          {seoText ? (
            <section className="mt-8 rounded-lg bg-card p-5 shadow-soft">
              <h2 className="text-lg font-semibold text-ink">{t("aboutCategory")}</h2>
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

type ShopTranslator = Awaited<ReturnType<typeof getTranslations>>;

function FilterForm({
  t,
  basePath,
  query,
  categories,
  brands,
  facets,
  hideCategory,
  hideBrand,
}: {
  t: ShopTranslator;
  basePath: string;
  query: ShopQuery;
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  facets: { sizes: string[]; colors: string[] };
  hideCategory: boolean;
  hideBrand: boolean;
}) {
  return (
    <form
      action={basePath}
      method="get"
      className="h-fit space-y-5 rounded-lg bg-card p-4 shadow-soft"
    >
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      {query.sort !== "newest" ? (
        <input type="hidden" name="sort" value={query.sort} />
      ) : null}

      {hideCategory ? null : (
        <CheckGroup
          legend={t("category")}
          name="category"
          selected={query.categories}
          options={categories.map((category) => ({
            value: category.slug,
            label: category.name,
          }))}
        />
      )}
      {hideBrand ? null : (
        <CheckGroup
          legend={t("brand")}
          name="brand"
          selected={query.brands}
          options={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
        />
      )}
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("price")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            type="number"
            name="min"
            min={0}
            placeholder={t("min")}
            defaultValue={query.minPrice ?? ""}
            aria-label={t("minPriceAria")}
            className="h-10 rounded-md border border-black/10 px-2 text-sm"
          />
          <input
            type="number"
            name="max"
            min={0}
            placeholder={t("max")}
            defaultValue={query.maxPrice ?? ""}
            aria-label={t("maxPriceAria")}
            className="h-10 rounded-md border border-black/10 px-2 text-sm"
          />
        </div>
      </fieldset>
      <CheckGroup
        legend={t("size")}
        name="size"
        selected={query.sizes}
        options={facets.sizes.map((size) => ({ value: size, label: size }))}
      />
      <CheckGroup
        legend={t("color")}
        name="color"
        selected={query.colors}
        options={facets.colors.map((color) => ({ value: color, label: color }))}
      />
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("rating")}</legend>
        <div className="mt-2 space-y-1 text-sm">
          {[4, 3].map((rating) => (
            <label key={rating} className="flex items-center gap-2">
              <input
                type="radio"
                name="rating"
                value={rating}
                defaultChecked={query.rating === rating}
              />
              {t("starsAndUp", { rating })}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="radio" name="rating" value="" defaultChecked={!query.rating} />
            {t("anyRating")}
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-ink">{t("availability")}</legend>
        <div className="mt-2 space-y-1 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="availability"
              value="in"
              defaultChecked={query.availability === "in"}
            />
            {t("inStock")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="availability"
              value="out"
              defaultChecked={query.availability === "out"}
            />
            {t("outOfStock")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="availability"
              value=""
              defaultChecked={!query.availability}
            />
            {t("allAvailability")}
          </label>
        </div>
      </fieldset>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass("primary")}>
          {t("apply")}
        </button>
        <Link href={basePath} className={buttonClass("outline")}>
          {t("clear")}
        </Link>
      </div>
    </form>
  );
}

function CheckGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="mt-2 space-y-1 text-sm">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
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
    <nav aria-label={t("paginationAria")} className="mt-6 flex flex-wrap gap-2">
      {pages.map((number) => (
        <Link
          key={number}
          href={shopHref(basePath, query, { page: number })}
          aria-current={number === page ? "page" : undefined}
          className={`grid h-10 w-10 place-items-center rounded-md text-sm font-semibold ${
            number === page ? "bg-primary text-white" : "bg-card text-ink shadow-soft"
          }`}
        >
          {number}
        </Link>
      ))}
    </nav>
  );
}
