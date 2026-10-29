import { Link } from "@/i18n/navigation";
import { Marquee } from "@/components/motion";
import { focusRing } from "@/components/ui/buttonStyles";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { cn } from "@/lib/utils/cn";

type RibbonCategory = { slug: string; name: string; hue: number };

function CategoryTile({ category }: { category: RibbonCategory }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn(
        "group flex w-24 shrink-0 snap-start flex-col items-center gap-2 rounded-theme p-1 text-center",
        focusRing,
      )}
    >
      <span className="rounded-full bg-card p-1 shadow-soft ring-2 ring-transparent transition-shadow duration-base ease-standard group-hover:ring-primary">
        <ProductMedia
          hue={category.hue}
          name={category.name}
          className="size-20 rounded-full text-lg"
        />
      </span>
      <span className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">
        {category.name}
      </span>
    </Link>
  );
}

/**
 * The homepage category ribbon: an infinite slow marquee from `md` up
 * (pauses on hover/focus; a plain scrollable row under reduced motion — both
 * handled inside Marquee), and a snap-scroll row on phones, per §4.2.
 */
export function CategoryRibbon({ categories }: { categories: RibbonCategory[] }) {
  if (categories.length === 0) {
    return null;
  }
  return (
    <>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden">
        {categories.map((category) => (
          <CategoryTile key={category.slug} category={category} />
        ))}
      </div>
      <Marquee
        className="hidden py-1 md:block"
        duration={Math.max(30, categories.length * 5)}
        gap="1.25rem"
      >
        {categories.map((category) => (
          <CategoryTile key={category.slug} category={category} />
        ))}
      </Marquee>
    </>
  );
}
