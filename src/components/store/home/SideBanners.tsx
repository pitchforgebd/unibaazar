import { Link } from "@/i18n/navigation";
import { PressScale } from "@/components/motion";
import { focusRing } from "@/components/ui/buttonStyles";
import { cn } from "@/lib/utils/cn";

type SideBanner = {
  id: string;
  title: string;
  href: string;
  imageUrl: string | null;
  imageHue: number | null;
};

/** The promo tiles beside the hero (two across on phones, stacked on desktop). */
export function SideBanners({ banners }: { banners: SideBanner[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
      {banners.map((banner) => (
        <PressScale key={banner.id} lift className="h-full">
          <Link
            href={banner.href}
            className={cn(
              "relative isolate grid h-full min-h-28 place-items-center overflow-hidden rounded-theme p-4 text-center font-heading text-sm font-semibold text-white shadow-soft",
              focusRing,
            )}
            style={
              banner.imageUrl
                ? {
                    backgroundImage: `url(${banner.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : // 24%, not 42% — see HeroSlider.tsx's identical fix:
                  // white text needs this low to clear 4.5:1 across
                  // every possible hue (yellow is the worst case).
                  { backgroundColor: `hsl(${banner.imageHue ?? 24} 70% 24%)` }
            }
          >
            {banner.imageUrl ? (
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-black/30" />
            ) : null}
            <span>{banner.title}</span>
          </Link>
        </PressScale>
      ))}
    </div>
  );
}
