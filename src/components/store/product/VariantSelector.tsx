import type { ProductAttribute } from "@/types/catalog";

type VariantSelectorProps = {
  attributes: ProductAttribute[];
  selected: Record<string, string>;
  onSelect: (name: string, label: string) => void;
};

export function VariantSelector({
  attributes,
  selected,
  onSelect,
}: VariantSelectorProps) {
  return (
    <div className="space-y-4">
      {attributes.map((attribute) => (
        <fieldset key={attribute.name}>
          <legend className="text-sm font-semibold text-ink">{attribute.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {attribute.values.map((value) => {
              const active = selected[attribute.name] === value.label;
              if (attribute.style === "swatch" && value.swatch) {
                return (
                  <button
                    key={value.label}
                    type="button"
                    aria-label={value.label}
                    aria-pressed={active}
                    onClick={() => onSelect(attribute.name, value.label)}
                    className={`h-9 w-9 rounded-full border ${
                      active ? "ring-2 ring-primary ring-offset-2" : "border-black/10"
                    }`}
                    style={{ backgroundColor: value.swatch }}
                  />
                );
              }
              return (
                <button
                  key={value.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(attribute.name, value.label)}
                  className={`h-10 min-w-10 rounded-md border px-3 text-sm font-semibold ${
                    active
                      ? "border-primary bg-peach text-primary"
                      : "border-black/10 bg-card text-ink"
                  }`}
                >
                  {value.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
