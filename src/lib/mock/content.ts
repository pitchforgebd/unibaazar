import type { BlogPost, CmsPage } from "@/types/catalog";

export const blogPosts: BlogPost[] = [
  {
    slug: "eid-shopping-checklist",
    title: "Eid shopping checklist",
    excerpt: "What to order early so sizes and delivery slots are still open.",
    author: "UniBaazar",
    date: "2026-09-15",
    hue: 24,
    content: [
      "Start with clothing sizes you already know, then add gifts that can ship early.",
      "Panjabis and tees sell through popular sizes first. If you are between sizes, check the size guide before checkout.",
      "Place wardrobe orders a few days ahead of Eid so outside-Dhaka parcels have a buffer.",
    ],
  },
  {
    slug: "how-cod-works",
    title: "How cash on delivery works",
    excerpt: "What you pay the rider, and when an order can be cancelled.",
    author: "UniBaazar",
    date: "2026-08-20",
    hue: 16,
    content: [
      "Cash on delivery means you pay the rider when the parcel arrives. Keep small notes if you can.",
      "You can ask to cancel before the parcel is handed to the courier. After that, refuse the delivery if you no longer want it.",
      "A phone number with a history of refused deliveries may be asked to prepay the delivery charge.",
    ],
  },
  {
    slug: "care-for-cotton-panjabi",
    title: "Care for a cotton panjabi",
    excerpt: "Wash and dry cotton so the fit stays the same.",
    author: "UniBaazar",
    date: "2026-07-08",
    hue: 30,
    content: [
      "Wash cotton in cold water and skip long soaks. Turn the garment inside out.",
      "Dry it in the shade. Direct sun fades dark dyes.",
      "Iron on medium heat while it is slightly damp.",
    ],
  },
];

export const cmsPages: CmsPage[] = [
  {
    slug: "about-us",
    title: "About us",
    paragraphs: [
      "UniBaazar is a Bangladesh marketplace for fashion, electronics, home, and everyday groceries.",
      "We work with local brands and authorized sellers. Product pages show the warranty and return rules before you order.",
      "Orders can be placed as a guest. Inside Dhaka and outside Dhaka have different delivery charges, and orders over the free-delivery amount ship free.",
    ],
  },
  {
    slug: "return-policy",
    title: "Return policy",
    paragraphs: [
      "Most unused items can be returned within 7 days of delivery if tags and seals are intact.",
      "Food, opened personal care, and items marked delivery-inspection-only follow the note on the product page.",
      "Start a return from your order details or the Order & Returns page. Refunds go back to the original method after we receive the item.",
    ],
  },
  {
    slug: "shipping-policy",
    title: "Shipping policy",
    paragraphs: [
      "Inside Dhaka delivery is charged at ৳70. Outside Dhaka is ৳130. Orders of ৳6,500 or more ship free.",
      "Inside Dhaka orders placed before 2pm usually leave the same day. Outside Dhaka takes longer and follows the courier route.",
      "You will get a tracking ID when the parcel is handed to the courier.",
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy policy",
    paragraphs: [
      "We collect your name, phone, address, and optional email to deliver orders and send status updates.",
      "Payment details for bKash, Nagad, Rocket, and cards are handled by the payment provider. We store the payment status, not the full wallet PIN.",
      "You can ask us to export or delete your customer record from the contact page.",
    ],
  },
  {
    slug: "terms-and-conditions",
    title: "Terms and conditions",
    paragraphs: [
      "Prices and stock on the site can change until the order is confirmed. The amount you confirm at checkout is the amount we charge.",
      "You agree to receive order updates by SMS on the phone number you enter.",
      "We may cancel an order that looks duplicated, uses a blacklisted phone, or cannot be delivered.",
    ],
  },
  {
    slug: "how-to-buy",
    title: "How to buy",
    paragraphs: [
      "Search or open a category, then choose the size or color. The price and stock update for that variant.",
      "Add the item to the cart or use Buy now. You can apply a coupon on the cart or at checkout.",
      "Enter your name, mobile number, and address. Pick inside or outside Dhaka, choose a payment method, and place the order.",
      "Save the order ID. Track it with the same phone number you used at checkout.",
    ],
  },
  {
    slug: "order-returns",
    title: "Order and returns",
    paragraphs: [
      "Track a parcel from Track Order with your order ID and phone number.",
      "To return an item, note the order ID and the reason. We will share a return pickup or drop-off step after we confirm the request.",
      "Refunds for cash on delivery are sent to the bKash or Nagad number you provide with the return.",
    ],
  },
];

export const faqs: { question: string; answer: string }[] = [
  {
    question: "How do I track an order?",
    answer:
      "Open Track Order and enter the order ID plus the phone number used at checkout.",
  },
  {
    question: "Which areas do you deliver?",
    answer:
      "We deliver inside Dhaka and outside Dhaka. The delivery charge is shown before you place the order.",
  },
  {
    question: "Can I order without an account?",
    answer:
      "Yes. Checkout works as a guest. You only need a name, mobile number, and address.",
  },
  {
    question: "When is delivery free?",
    answer: "Delivery is free when the merchandise total is ৳6,500 or more.",
  },
  {
    question: "How do returns work?",
    answer:
      "Unused items with tags can usually be returned within 7 days. The product page lists any exception.",
  },
];

export const heroSlides = [
  {
    title: "Flash deals this week",
    text: "Phones, fashion, and pantry staples with a live countdown.",
    href: "/flash-deals",
    action: "Shop flash deals",
    hue: 24,
  },
  {
    title: "Fashion for the season",
    text: "Panjabis and tees with size and color stock on the product page.",
    href: "/category/fashion",
    action: "Browse fashion",
    hue: 340,
  },
  {
    title: "Home essentials",
    text: "Appliances with local warranty and clear delivery charges.",
    href: "/category/home",
    action: "Shop home",
    hue: 200,
  },
];

export const sideBanners = [
  {
    title: "Free delivery over ৳6,500",
    href: "/shipping-policy",
    hue: 16,
  },
  {
    title: "Offers on daily essentials",
    href: "/offers",
    hue: 140,
  },
];
