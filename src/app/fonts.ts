import { Noto_Sans_Bengali, Playfair_Display, Poppins } from "next/font/google";

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
  display: "swap",
});

// Luxe preset's heading font (src/lib/theme/presets.ts) — an elegant
// serif, used only via the `font-heading` utility, never for body copy.
export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const fontVariables = `${poppins.variable} ${notoSansBengali.variable} ${playfairDisplay.variable}`;
