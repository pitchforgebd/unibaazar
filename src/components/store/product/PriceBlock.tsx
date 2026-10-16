import { formatTaka } from "@/lib/utils/currency";

type PriceBlockProps = {
  current: number;
  regular: number | null;
};

export function PriceBlock({ current, regular }: PriceBlockProps) {
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className="text-lg font-semibold text-primary">{formatTaka(current)}</span>
      {regular ? (
        <span className="text-sm text-muted line-through">{formatTaka(regular)}</span>
      ) : null}
    </p>
  );
}
