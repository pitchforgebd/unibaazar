import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: "#F95B09",
        "primary-dark": "#E64A00",
        peach: "#FFF0E8",
        ink: "#000000",
        page: "#F5F5F5",
        card: "#FFFFFF",
        success: "#1F7A0F",
        whatsapp: "#25D366",
        foreground: "#111827",
        muted: "#6B7280",
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.06)",
      },
      maxWidth: {
        container: "1280px",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "var(--font-noto-bengali)", "sans-serif"],
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        bump: {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "60%": { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.25s ease-out",
        bump: "bump 0.4s ease-out",
        "pop-in": "pop-in 0.2s ease-out",
      },
    },
  },
} satisfies Config;

export default config;
