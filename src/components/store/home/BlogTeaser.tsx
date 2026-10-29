import { Link } from "@/i18n/navigation";
import { PressScale, Stagger, StaggerItem } from "@/components/motion";
import { ProductMedia } from "@/components/store/product/ProductMedia";

type HomePost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  hue: number;
};

export function BlogTeaser({ posts }: { posts: HomePost[] }) {
  return (
    <Stagger className="grid gap-3 md:grid-cols-3">
      {posts.map((post) => (
        <StaggerItem key={post.slug}>
          <PressScale lift className="h-full">
            <Link
              href={`/blog/${post.slug}`}
              className="group block h-full overflow-hidden rounded-theme bg-card shadow-soft transition-shadow duration-base ease-standard hover:shadow-lg"
            >
              <ProductMedia hue={post.hue} name={post.title} className="h-36" />
              <div className="p-4">
                <p className="text-xs text-muted">{post.date}</p>
                <h3 className="mt-1 font-heading font-semibold text-ink group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{post.excerpt}</p>
              </div>
            </Link>
          </PressScale>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
