import Link from "next/link";

type SectionHeadingProps = {
  title: string;
  href?: string;
  action?: string;
};

export function SectionHeading({ title, href, action }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="text-xl font-bold text-ink sm:text-2xl">{title}</h2>
      {href && action ? (
        <Link href={href} className="text-sm font-semibold text-primary hover:underline">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
