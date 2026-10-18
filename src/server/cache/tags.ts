// Central cache-tag vocabulary for unstable_cache()-wrapped reads and the
// revalidateTag() calls admin writes fire. Keeping the tag names in one
// place means a typo can't silently desync a writer from a reader.
export const TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  categories: "categories",
  category: (slug: string) => `category:${slug}`,
  brands: "brands",
  brand: (slug: string) => `brand:${slug}`,
  home: "home",
  blog: "blog",
  blogPost: (slug: string) => `blog:${slug}`,
  cmsPages: "cms-pages",
  cmsPage: (slug: string) => `cms-page:${slug}`,
  settings: "settings",
} as const;
