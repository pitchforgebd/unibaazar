type StarRatingProps = {
  rating: number;
};

export function StarRating({ rating }: StarRatingProps) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <p
      className="flex items-center gap-1 text-xs text-muted"
      aria-label={`Rated ${rating} out of 5`}
    >
      <span aria-hidden="true" className="tracking-tight text-primary">
        {"★★★★★".slice(0, full)}
        <span className="text-black/15">{"★★★★★".slice(full)}</span>
      </span>
      <span>{rating.toFixed(1)}</span>
    </p>
  );
}
