import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ProductImage } from "@/types/catalog";

type ProductMediaProps = {
  hue: number;
  name: string;
  image?: ProductImage | null;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
};

function svgData(hue: number, letter: string, size: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="hsl(${hue} 75% 92%)"/><text x="50%" y="56%" text-anchor="middle" font-size="${Math.round(size * 0.28)}" font-family="Poppins,sans-serif" fill="hsl(${hue} 45% 32%)">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function ProductMedia({
  hue,
  name,
  image,
  className,
  imgClassName,
  loading = "lazy",
}: ProductMediaProps) {
  const letter = name.slice(0, 1);

  if (image) {
    return (
      <span className={cn("relative block overflow-hidden", className)}>
        <Image
          src={image.url}
          alt={image.alt || name}
          width={640}
          height={640}
          loading={loading}
          className={cn("h-full w-full object-cover", imgClassName)}
        />
      </span>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      <Image
        src={svgData(hue, letter, 640)}
        alt={name}
        width={640}
        height={640}
        unoptimized
        loading={loading}
        placeholder="blur"
        blurDataURL={svgData(hue, "", 8)}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </span>
  );
}
