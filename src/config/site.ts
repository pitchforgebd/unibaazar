export type SiteLink = {
  id: string;
  label: string;
  href: string;
};

export type SocialName = "Facebook" | "Instagram" | "YouTube" | "WhatsApp";

export type SocialLink = {
  label: SocialName;
  href: string;
};

type SiteConfig = {
  name: string;
  description: string;
  freeShippingThreshold: number;
  contact: {
    phoneDisplay: string;
    phoneHref: string;
    email: string;
    address: string;
  };
  topBarLinks: SiteLink[];
  customerServiceLinks: SiteLink[];
  usefulLinks: SiteLink[];
  mobileNav: SiteLink[];
  paymentMethods: string[];
  deliveryPartners: string[];
  socialLinks: SocialLink[];
  chat: {
    whatsapp: string;
    messenger: string;
  };
};

export const siteConfig: SiteConfig = {
  name: "UniBaazar",
  description:
    "Shop fashion, electronics, and daily essentials with delivery across Bangladesh.",
  freeShippingThreshold: 6500,
  contact: {
    phoneDisplay: "01700-000000",
    phoneHref: "tel:+8801700000000",
    email: "hello@unibaazar.com",
    address: "Dhaka, Bangladesh",
  },
  topBarLinks: [
    { id: "newsletter", label: "Newsletter", href: "#newsletter" },
    { id: "trackOrder", label: "Track Order", href: "/track-order" },
    { id: "login", label: "Login / Register", href: "/login" },
    { id: "help", label: "Help & Support", href: "/contact-us" },
    { id: "faq", label: "FAQs", href: "/faq" },
  ],
  customerServiceLinks: [
    { id: "contact", label: "Contact Us", href: "/contact-us" },
    { id: "trackOrder", label: "Track Order", href: "/track-order" },
    { id: "howToBuy", label: "How to Buy", href: "/how-to-buy" },
    { id: "returnPolicy", label: "Return Policy", href: "/return-policy" },
    { id: "shippingPolicy", label: "Shipping Policy", href: "/shipping-policy" },
    { id: "faq", label: "FAQs", href: "/faq" },
  ],
  usefulLinks: [
    { id: "about", label: "About Us", href: "/about-us" },
    { id: "blog", label: "Blog", href: "/blog" },
    { id: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
    { id: "terms", label: "Terms & Conditions", href: "/terms-and-conditions" },
    { id: "sizeGuide", label: "Size Guide", href: "/size-guide" },
    { id: "orderReturns", label: "Order & Returns", href: "/order-returns" },
  ],
  mobileNav: [
    { id: "home", label: "Home", href: "/" },
    { id: "categories", label: "Categories", href: "/shop" },
    { id: "cart", label: "Cart", href: "/cart" },
    { id: "account", label: "Account", href: "/account" },
  ],
  paymentMethods: ["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "Amex"],
  deliveryPartners: ["Pathao", "Steadfast", "RedX", "iEX"],
  socialLinks: [
    { label: "Facebook", href: "#" },
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "WhatsApp", href: "#" },
  ],
  chat: {
    whatsapp: "https://wa.me/8801700000000",
    messenger: "https://m.me/unibaazar",
  },
};
