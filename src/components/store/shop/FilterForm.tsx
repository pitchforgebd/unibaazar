import type { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/RadioGroup";
import type { ShopQuery } from "@/types/catalog";

export type ShopTranslator = Awaited<ReturnType<typeof getTranslations>>;

type Option = { value: string; label: string };

export type FilterFormProps = {
  /** Lets a submit button outside the form (the mobile sheet's footer) target it. */
  id: string;
  t: ShopTranslator;
  basePath: string;
  query: ShopQuery;
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
  facets: { sizes: string[]; colors: string[] };
  hideCategory: boolean;
  hideBrand: boolean;
  /** Render Apply/Clear inside the form (the desktop sidebar). */
  withActions: boolean;
};

const legendClass = "font-heading text-sm font-semibold text-ink";

/**
 * The listing filters as a plain GET form: submitting it navigates to
 * `basePath?category=…&min=…`, which the page parses with parseShopQuery.
 * Rendered once in the desktop sidebar and once inside the mobile bottom
 * sheet — same fields, same submission, different placement.
 */
export function FilterForm({
  id,
  t,
  basePath,
  query,
  categories,
  brands,
  facets,
  hideCategory,
  hideBrand,
  withActions,
}: FilterFormProps) {
  return (
    <form id={id} action={basePath} method="get" className="space-y-6">
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
        <legend className={legendClass}>{t("price")}</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            type="number"
            name="min"
            min={0}
            inputMode="numeric"
            label={t("minPriceAria")}
            hideLabel
            placeholder={t("min")}
            defaultValue={query.minPrice ?? ""}
          />
          <Input
            type="number"
            name="max"
            min={0}
            inputMode="numeric"
            label={t("maxPriceAria")}
            hideLabel
            placeholder={t("max")}
            defaultValue={query.maxPrice ?? ""}
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
      <RadioGroup
        label={<span className={legendClass}>{t("rating")}</span>}
        name="rating"
        defaultValue={query.rating ? String(query.rating) : ""}
      >
        {[4, 3].map((rating) => (
          <Radio
            key={rating}
            value={String(rating)}
            label={t("starsAndUp", { rating })}
          />
        ))}
        <Radio value="" label={t("anyRating")} />
      </RadioGroup>
      <RadioGroup
        label={<span className={legendClass}>{t("availability")}</span>}
        name="availability"
        defaultValue={query.availability ?? ""}
      >
        <Radio value="in" label={t("inStock")} />
        <Radio value="out" label={t("outOfStock")} />
        <Radio value="" label={t("allAvailability")} />
      </RadioGroup>
      {withActions ? (
        <div className="flex gap-2">
          <Button type="submit">{t("apply")}</Button>
          <Link href={basePath} className={buttonStyles({ variant: "outline" })}>
            {t("clear")}
          </Link>
        </div>
      ) : null}
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
  options: Option[];
  selected: string[];
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <fieldset>
      <legend className={legendClass}>{legend}</legend>
      <div className="mt-3 space-y-2.5">
        {options.map((option) => (
          <Checkbox
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            defaultChecked={selected.includes(option.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}
