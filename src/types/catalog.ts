export type AttributeStyle = "button" | "swatch";

export type AttributeValue = {
  label: string;
  swatch?: string;
};

export type ProductAttribute = {
  name: string;
  style: AttributeStyle;
  values: AttributeValue[];
};

export type VariantAttributes = Record<string, string>;

export type ProductImage = {
  url: string;
  alt: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  imageHue: number;
  image: ProductImage | null;
  attributes: VariantAttributes;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  categorySlug: string;
  rating: number;
  reviewCount: number;
  imageHue: number;
  images: ProductImage[];
  shortDescription: string;
  description: string;
  warranty: string;
  returns: string;
  videoUrl?: string;
  featured: boolean;
  bestSeller: boolean;
  isNew: boolean;
  flashSale: boolean;
  createdAt: string;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  seoText: string;
  hue: number;
};

export type Brand = {
  slug: string;
  name: string;
  description: string;
};

export type Review = {
  id: string;
  productSlug: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type ProductQuestion = {
  id: string;
  productSlug: string;
  question: string;
  author: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string[];
  author: string;
  date: string;
  hue: number;
};

export type CmsPage = {
  slug: string;
  title: string;
  paragraphs: string[];
};

export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket" | "card";

export type OrderStatus =
  | "Pending"
  | "Confirmed"
  | "Processing"
  | "Ready to ship"
  | "Sent to courier"
  | "Shipped"
  | "Delivered"
  | "Completed"
  | "Cancelled"
  | "Return requested"
  | "Returned"
  | "Failed"
  | "On hold"
  | "Partial delivered"
  | "Refunded";

export type OrderLine = {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
};

export type OrderTimelineStep = {
  label: string;
  at: string;
  done: boolean;
};

export type Order = {
  id: string;
  trackingId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: DeliveryArea;
  paymentMethod: PaymentMethod;
  items: OrderLine[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  status: OrderStatus;
  timeline: OrderTimelineStep[];
  placedAt: string;
};

export type ShopSort = "newest" | "price-asc" | "price-desc" | "rating" | "name";

export type ShopQuery = {
  categories: string[];
  brands: string[];
  sizes: string[];
  colors: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  availability?: "in" | "out";
  sort: ShopSort;
  page: number;
  q: string;
};

export type CartLine = {
  slug: string;
  variantId: string;
  qty: number;
};

export type Coupon = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
};
