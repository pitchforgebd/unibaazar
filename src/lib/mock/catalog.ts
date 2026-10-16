import { createSimpleVariant } from "@/lib/catalog/variants";
import type {
  AttributeValue,
  Brand,
  Category,
  Coupon,
  Product,
  ProductAttribute,
  ProductQuestion,
  Review,
} from "@/types/catalog";

export const categories: Category[] = [
  {
    slug: "electronics",
    name: "Electronics",
    description: "Phones, audio, and home electronics.",
    seoText:
      "Shop phones, audio, and home electronics at UniBaazar with official warranty and delivery across Bangladesh.",
    hue: 24,
  },
  {
    slug: "fashion",
    name: "Fashion",
    description: "Clothing and accessories for every day.",
    seoText:
      "Browse fashion for men and women, from panjabis to everyday tees, with easy returns and size guidance.",
    hue: 340,
  },
  {
    slug: "home",
    name: "Home",
    description: "Appliances and kitchen essentials.",
    seoText:
      "Find appliances and kitchen tools chosen for Bangladeshi homes, with service support and spare-part friendly brands.",
    hue: 200,
  },
  {
    slug: "beauty",
    name: "Beauty",
    description: "Skin and personal care.",
    seoText:
      "Everyday beauty and personal care from trusted brands, delivered inside and outside Dhaka.",
    hue: 320,
  },
  {
    slug: "groceries",
    name: "Groceries",
    description: "Staples for the weekly shop.",
    seoText:
      "Stock rice, oil, and pantry staples with clear pack sizes and fresh-batch dates on every grocery page.",
    hue: 90,
  },
  {
    slug: "kids",
    name: "Kids",
    description: "School and play essentials.",
    seoText:
      "School bags, bottles, and everyday kids items with sturdy materials and honest size notes.",
    hue: 45,
  },
];

export const brands: Brand[] = [
  {
    slug: "samsung",
    name: "Samsung",
    description: "Phones and electronics with official local warranty.",
  },
  {
    slug: "xiaomi",
    name: "Xiaomi",
    description: "Audio and wearables at practical prices.",
  },
  {
    slug: "walton",
    name: "Walton",
    description: "Home appliances built for Bangladesh.",
  },
  {
    slug: "aarong",
    name: "Aarong",
    description: "Clothing and lifestyle goods.",
  },
  {
    slug: "fresh",
    name: "Fresh",
    description: "Groceries and daily staples.",
  },
  {
    slug: "neem",
    name: "Neem",
    description: "Simple personal care.",
  },
];

function brandName(slug: string): string {
  return brands.find((brand) => brand.slug === slug)?.name ?? slug;
}

const color = (label: string, swatch: string): AttributeValue => ({ label, swatch });

const sizeAttr = (labels: string[]): ProductAttribute => ({
  name: "Size",
  style: "button",
  values: labels.map((label) => ({ label })),
});

const colorAttr = (values: AttributeValue[]): ProductAttribute => ({
  name: "Color",
  style: "swatch",
  values,
});

type SimpleInput = {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  categorySlug: string;
  price: number;
  salePrice: number | null;
  stock: number;
  sku: string;
  rating: number;
  reviewCount: number;
  imageHue: number;
  shortDescription: string;
  description: string;
  warranty: string;
  returns: string;
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  flashSale?: boolean;
  createdAt: string;
};

function simpleProduct(input: SimpleInput): Product {
  const variant = createSimpleVariant({
    id: `${input.id}-default`,
    sku: input.sku,
    price: input.price,
    salePrice: input.salePrice,
    stock: input.stock,
    imageHue: input.imageHue,
  });

  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    brandSlug: input.brandSlug,
    brandName: brandName(input.brandSlug),
    categorySlug: input.categorySlug,
    rating: input.rating,
    reviewCount: input.reviewCount,
    imageHue: input.imageHue,
    images: [],
    shortDescription: input.shortDescription,
    description: input.description,
    warranty: input.warranty,
    returns: input.returns,
    videoUrl: "",
    featured: input.featured ?? false,
    bestSeller: input.bestSeller ?? false,
    isNew: input.isNew ?? false,
    flashSale: input.flashSale ?? false,
    createdAt: input.createdAt,
    attributes: [],
    variants: [variant],
  };
}

export const products: Product[] = [
  {
    id: "p1",
    slug: "samsung-galaxy-a15",
    name: "Samsung Galaxy A15",
    brandSlug: "samsung",
    brandName: brandName("samsung"),
    categorySlug: "electronics",
    rating: 4.6,
    reviewCount: 128,
    imageHue: 220,
    images: [],
    shortDescription: "6.5-inch display, 128GB storage, and a long-lasting battery.",
    description:
      "The Galaxy A15 is a practical daily phone with a bright display, a dependable battery, and official local warranty. Choose a color to see the live price, stock, and SKU for that variant.",
    warranty: "1 year official warranty",
    returns: "7-day replacement if the seal is intact and the phone is unused",
    featured: true,
    bestSeller: true,
    isNew: false,
    flashSale: false,
    createdAt: "2026-09-18",
    attributes: [
      colorAttr([
        color("Black", "#111827"),
        color("Blue", "#1D4ED8"),
        color("Green", "#15803D"),
      ]),
    ],
    variants: [
      {
        id: "a15-black",
        sku: "SAM-A15-BLK",
        price: 22990,
        salePrice: 19990,
        stock: 12,
        imageHue: 220,
        image: null,
        attributes: { Color: "Black" },
      },
      {
        id: "a15-blue",
        sku: "SAM-A15-BLU",
        price: 22990,
        salePrice: 20490,
        stock: 4,
        imageHue: 220,
        image: null,
        attributes: { Color: "Blue" },
      },
      {
        id: "a15-green",
        sku: "SAM-A15-GRN",
        price: 22990,
        salePrice: null,
        stock: 0,
        imageHue: 140,
        image: null,
        attributes: { Color: "Green" },
      },
    ],
  },
  simpleProduct({
    id: "p2",
    slug: "redmi-buds-4",
    name: "Redmi Buds 4",
    brandSlug: "xiaomi",
    categorySlug: "electronics",
    price: 3490,
    salePrice: 2790,
    stock: 30,
    sku: "XM-BUDS-4",
    rating: 4.3,
    reviewCount: 86,
    imageHue: 16,
    shortDescription: "Wireless earbuds with a charging case and clear calls.",
    description:
      "Light earbuds for commuting and calls. The case holds extra charges, and the fit suits long wear.",
    warranty: "6 months warranty",
    returns: "7-day return in original packaging",
    featured: true,
    flashSale: true,
    createdAt: "2026-09-28",
  }),
  simpleProduct({
    id: "p3",
    slug: "walton-refrigerator-220l",
    name: "Walton Refrigerator 220L",
    brandSlug: "walton",
    categorySlug: "home",
    price: 42900,
    salePrice: 39900,
    stock: 6,
    sku: "WAL-REF-220",
    rating: 4.5,
    reviewCount: 54,
    imageHue: 200,
    shortDescription: "220 litre direct cool fridge for small families.",
    description:
      "A direct-cool refrigerator sized for apartments, with a separate freezer door and local service support.",
    warranty: "5 years compressor, 1 year parts",
    returns: "Delivery inspection only. Report damage before the rider leaves.",
    featured: true,
    bestSeller: true,
    createdAt: "2026-08-02",
  }),
  {
    id: "p4",
    slug: "aarong-cotton-panjabi",
    name: "Aarong Cotton Panjabi",
    brandSlug: "aarong",
    brandName: brandName("aarong"),
    categorySlug: "fashion",
    rating: 4.8,
    reviewCount: 210,
    imageHue: 30,
    images: [],
    shortDescription: "Breathable cotton panjabi with a regular fit.",
    description:
      "A regular-fit cotton panjabi for everyday wear and Eid. Pick a size to update the price and stock. Measurements are on the size guide.",
    warranty: "No manufacturing warranty",
    returns: "Exchange within 7 days if unused, with tags attached",
    featured: false,
    bestSeller: true,
    isNew: false,
    flashSale: true,
    createdAt: "2026-09-01",
    attributes: [sizeAttr(["M", "L", "XL"])],
    variants: [
      {
        id: "panjabi-m",
        sku: "AAR-PAN-M",
        price: 2850,
        salePrice: 2450,
        stock: 8,
        imageHue: 30,
        image: null,
        attributes: { Size: "M" },
      },
      {
        id: "panjabi-l",
        sku: "AAR-PAN-L",
        price: 2850,
        salePrice: 2450,
        stock: 5,
        imageHue: 32,
        image: null,
        attributes: { Size: "L" },
      },
      {
        id: "panjabi-xl",
        sku: "AAR-PAN-XL",
        price: 3050,
        salePrice: null,
        stock: 2,
        imageHue: 28,
        image: null,
        attributes: { Size: "XL" },
      },
    ],
  },
  {
    id: "p5",
    slug: "cotton-crew-tshirt",
    name: "Cotton Crew T-Shirt",
    brandSlug: "aarong",
    brandName: brandName("aarong"),
    categorySlug: "fashion",
    rating: 4.2,
    reviewCount: 73,
    imageHue: 0,
    images: [],
    shortDescription: "Soft crew-neck tee in black or white.",
    description:
      "A mid-weight cotton tee. Size and color each have their own stock. White has a slightly higher sale price this week.",
    warranty: "No manufacturing warranty",
    returns: "Exchange within 7 days if unused, with tags attached",
    featured: false,
    bestSeller: false,
    isNew: true,
    flashSale: true,
    createdAt: "2026-10-01",
    attributes: [
      sizeAttr(["S", "M", "L"]),
      colorAttr([color("Black", "#111827"), color("White", "#F9FAFB")]),
    ],
    variants: [
      {
        id: "tee-s-black",
        sku: "TEE-S-BLK",
        price: 890,
        salePrice: 690,
        stock: 10,
        imageHue: 0,
        image: null,
        attributes: { Size: "S", Color: "Black" },
      },
      {
        id: "tee-m-black",
        sku: "TEE-M-BLK",
        price: 890,
        salePrice: 690,
        stock: 14,
        imageHue: 0,
        image: null,
        attributes: { Size: "M", Color: "Black" },
      },
      {
        id: "tee-l-black",
        sku: "TEE-L-BLK",
        price: 890,
        salePrice: 690,
        stock: 0,
        imageHue: 0,
        image: null,
        attributes: { Size: "L", Color: "Black" },
      },
      {
        id: "tee-s-white",
        sku: "TEE-S-WHT",
        price: 890,
        salePrice: 750,
        stock: 6,
        imageHue: 40,
        image: null,
        attributes: { Size: "S", Color: "White" },
      },
      {
        id: "tee-m-white",
        sku: "TEE-M-WHT",
        price: 890,
        salePrice: 750,
        stock: 9,
        imageHue: 40,
        image: null,
        attributes: { Size: "M", Color: "White" },
      },
      {
        id: "tee-l-white",
        sku: "TEE-L-WHT",
        price: 890,
        salePrice: 750,
        stock: 3,
        imageHue: 40,
        image: null,
        attributes: { Size: "L", Color: "White" },
      },
    ],
  },
  simpleProduct({
    id: "p6",
    slug: "kids-school-bag",
    name: "Kids School Bag",
    brandSlug: "aarong",
    categorySlug: "kids",
    price: 1650,
    salePrice: null,
    stock: 18,
    sku: "KID-BAG-01",
    rating: 4.4,
    reviewCount: 41,
    imageHue: 45,
    shortDescription: "Padded school bag with a side bottle pocket.",
    description:
      "A compact school bag with a padded back and a front pocket for tiffin. Made for primary-school use.",
    warranty: "30-day stitch warranty",
    returns: "7-day return if unused",
    isNew: true,
    createdAt: "2026-09-22",
  }),
  simpleProduct({
    id: "p7",
    slug: "miniket-rice-5kg",
    name: "Miniket Rice 5kg",
    brandSlug: "fresh",
    categorySlug: "groceries",
    price: 620,
    salePrice: 560,
    stock: 40,
    sku: "FRS-RICE-5",
    rating: 4.1,
    reviewCount: 33,
    imageHue: 80,
    shortDescription: "5kg pack of everyday miniket rice.",
    description:
      "A sealed 5kg pack for daily meals. Store it in a dry jar after opening.",
    warranty: "Food item. Check the pack date on delivery.",
    returns: "Report a damaged seal on delivery",
    flashSale: true,
    isNew: true,
    createdAt: "2026-10-02",
  }),
  simpleProduct({
    id: "p8",
    slug: "neem-face-wash",
    name: "Neem Face Wash",
    brandSlug: "neem",
    categorySlug: "beauty",
    price: 280,
    salePrice: 240,
    stock: 50,
    sku: "NEEM-FW-100",
    rating: 4,
    reviewCount: 19,
    imageHue: 130,
    shortDescription: "100ml daily face wash for normal skin.",
    description:
      "A simple gel face wash for daily use. Patch-test if your skin is sensitive.",
    warranty: "Use before the date printed on the tube",
    returns: "Sealed tubes can be returned within 3 days",
    featured: true,
    createdAt: "2026-07-19",
  }),
  {
    id: "p9",
    slug: "xiaomi-smart-watch",
    name: "Xiaomi Smart Watch",
    brandSlug: "xiaomi",
    brandName: brandName("xiaomi"),
    categorySlug: "electronics",
    rating: 4.4,
    reviewCount: 97,
    imageHue: 190,
    images: [],
    shortDescription: "Heart-rate watch with a week of typical battery life.",
    description:
      "Tracks steps and heart rate and shows call alerts. Each strap color has its own stock count.",
    warranty: "1 year warranty",
    returns: "7-day replacement for dead-on-arrival units",
    featured: true,
    bestSeller: true,
    isNew: true,
    flashSale: true,
    createdAt: "2026-09-30",
    attributes: [colorAttr([color("Black", "#111827"), color("Silver", "#D1D5DB")])],
    variants: [
      {
        id: "watch-black",
        sku: "XM-WATCH-BLK",
        price: 4990,
        salePrice: 4290,
        stock: 15,
        imageHue: 190,
        image: null,
        attributes: { Color: "Black" },
      },
      {
        id: "watch-silver",
        sku: "XM-WATCH-SLV",
        price: 4990,
        salePrice: 4490,
        stock: 7,
        imageHue: 210,
        image: null,
        attributes: { Color: "Silver" },
      },
    ],
  },
  simpleProduct({
    id: "p10",
    slug: "nonstick-frying-pan",
    name: "Non-stick Frying Pan",
    brandSlug: "walton",
    categorySlug: "home",
    price: 1250,
    salePrice: null,
    stock: 0,
    sku: "WAL-PAN-24",
    rating: 3.8,
    reviewCount: 12,
    imageHue: 15,
    shortDescription: "24cm pan for everyday cooking. Currently out of stock.",
    description:
      "A 24cm non-stick pan. This listing is out of stock so the shop filter can show unavailable items.",
    warranty: "6 months coating warranty",
    returns: "7-day return if unused",
    createdAt: "2026-06-11",
  }),
  {
    id: "p11",
    slug: "leather-card-wallet",
    name: "Leather Card Wallet",
    brandSlug: "aarong",
    brandName: brandName("aarong"),
    categorySlug: "fashion",
    rating: 4.7,
    reviewCount: 64,
    imageHue: 25,
    images: [],
    shortDescription: "Slim wallet for cards and a few notes.",
    description:
      "Vegetable-tanned look leather with four card slots. Brown and black are stocked separately.",
    warranty: "30-day stitch warranty",
    returns: "7-day exchange if unused",
    featured: false,
    bestSeller: false,
    isNew: false,
    flashSale: false,
    createdAt: "2026-08-21",
    attributes: [colorAttr([color("Brown", "#92400E"), color("Black", "#111827")])],
    variants: [
      {
        id: "wallet-brown",
        sku: "WALLET-BRN",
        price: 1450,
        salePrice: 1190,
        stock: 11,
        imageHue: 25,
        image: null,
        attributes: { Color: "Brown" },
      },
      {
        id: "wallet-black",
        sku: "WALLET-BLK",
        price: 1450,
        salePrice: 1190,
        stock: 9,
        imageHue: 0,
        image: null,
        attributes: { Color: "Black" },
      },
    ],
  },
  simpleProduct({
    id: "p12",
    slug: "walton-blender-2l",
    name: "Walton Blender 2L",
    brandSlug: "walton",
    categorySlug: "home",
    price: 3890,
    salePrice: 3490,
    stock: 9,
    sku: "WAL-BLD-2L",
    rating: 4.3,
    reviewCount: 27,
    imageHue: 175,
    shortDescription: "2 litre blender for juice and batter.",
    description:
      "Two speeds plus pulse, with a 2 litre jar. Keep the lid locked while it runs.",
    warranty: "1 year motor warranty",
    returns: "7-day replacement for a motor that fails on arrival",
    bestSeller: true,
    createdAt: "2026-09-05",
  }),
];

export const reviews: Review[] = [
  {
    id: "r1",
    productSlug: "samsung-galaxy-a15",
    author: "Nusrat J.",
    rating: 5,
    comment:
      "Battery lasts a full day of calls and maps. Delivery inside Dhaka was next day.",
    createdAt: "2026-09-20",
  },
  {
    id: "r2",
    productSlug: "samsung-galaxy-a15",
    author: "Imran H.",
    rating: 4,
    comment: "Solid phone for the price. The blue one I ordered matched the photo.",
    createdAt: "2026-09-26",
  },
  {
    id: "r3",
    productSlug: "cotton-crew-tshirt",
    author: "Mitu R.",
    rating: 4,
    comment: "Soft fabric. Size M fit as described on the size guide.",
    createdAt: "2026-10-02",
  },
  {
    id: "r4",
    productSlug: "aarong-cotton-panjabi",
    author: "Farhan A.",
    rating: 5,
    comment: "Wore it for jumma. The cotton stays comfortable in humidity.",
    createdAt: "2026-09-12",
  },
];

export const questions: ProductQuestion[] = [
  {
    id: "q1",
    productSlug: "samsung-galaxy-a15",
    author: "Sadia",
    question: "Is the warranty official in Bangladesh?",
    answer: "Yes. It includes 1 year official warranty. Keep the invoice.",
  },
  {
    id: "q2",
    productSlug: "aarong-cotton-panjabi",
    author: "Tanvir",
    question: "Does XL cost more?",
    answer: "Yes. XL is listed at the regular price while M and L are on sale.",
  },
  {
    id: "q3",
    productSlug: "miniket-rice-5kg",
    author: "Lamia",
    question: "Can I return an opened pack?",
    answer: "Report a torn seal on delivery. Opened food packs are not returned.",
  },
];

export const coupons: Coupon[] = [
  { code: "SAVE10", type: "percent", value: 10, minSubtotal: 500 },
  { code: "FLAT100", type: "fixed", value: 100, minSubtotal: 1000 },
];

export const flashSaleEndsAt = "2026-10-20T23:59:59+06:00";
