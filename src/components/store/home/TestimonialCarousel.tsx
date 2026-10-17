import { Quote, Star } from "lucide-react";
import { useTranslations } from "next-intl";

type Testimonial = {
  id: string;
  name: string;
  quote: string;
  rating: number;
  imageUrl: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-primary">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={14}
          className={value <= rating ? "fill-primary" : "fill-transparent text-black/15"}
        />
      ))}
    </div>
  );
}

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const t = useTranslations("home");
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {items.map((item) =>
        item.imageUrl ? (
          <figure
            key={item.id}
            className="w-64 shrink-0 snap-start overflow-hidden rounded-lg bg-card shadow-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={t("testimonialAlt", { name: item.name })}
              className="w-full"
            />
            <figcaption className="px-3 py-2 text-xs font-semibold text-muted">
              {item.name}
            </figcaption>
          </figure>
        ) : (
          <article
            key={item.id}
            className="flex w-72 shrink-0 snap-start flex-col rounded-lg bg-card p-5 shadow-soft"
          >
            <Quote className="h-6 w-6 text-primary/40" />
            <p className="mt-2 flex-1 text-sm leading-6 text-ink">{item.quote}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-peach text-sm font-bold text-primary">
                {item.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{item.name}</p>
                <Stars rating={item.rating} />
              </div>
            </div>
          </article>
        ),
      )}
    </div>
  );
}
