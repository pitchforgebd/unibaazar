import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  className?: string;
  name?: string;
  logoUrl?: string;
};

export function Logo({ className, name = siteConfig.name, logoUrl = "" }: LogoProps) {
  const wordmark = name === "UniBaazar";
  return (
    <Link
      href="/"
      aria-label={name}
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
    >
      {logoUrl ? (
        <span
          aria-hidden="true"
          className="h-9 w-9 rounded-md bg-cover bg-center"
          style={{ backgroundImage: `url("${logoUrl.replace(/"/g, "")}")` }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-9 w-9 place-items-center rounded-md bg-primary text-base font-bold text-white"
        >
          {name.slice(0, 1)}
        </span>
      )}
      <span className="text-xl font-bold tracking-tight">
        {wordmark ? (
          <>
            <span className="text-primary">Uni</span>
            <span className="text-ink">Baazar</span>
          </>
        ) : (
          <span className="text-ink">{name}</span>
        )}
      </span>
    </Link>
  );
}
