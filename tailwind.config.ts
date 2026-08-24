import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutrals: Soft Sand background → Charcoal text.
        ink: {
          50: "#F4F1EC", // Soft Sand
          100: "#ECE7DE",
          200: "#DED5C7",
          300: "#C9BCA8",
          400: "#756C5A", // darkened for WCAG AA text contrast (used only as text-ink-400)
          500: "#7C7363",
          600: "#5C5547",
          700: "#44403A",
          800: "#343230",
          900: "#2D2D2D", // Charcoal Gray
        },
        // Primary accent: Olive Green.
        brand: {
          50: "#EFF2EC",
          100: "#DDE4D6",
          200: "#C2CDB7",
          300: "#A3B295",
          400: "#859673",
          500: "#6A7A5F", // Olive Green
          600: "#5B6A52",
          700: "#49553F",
          800: "#3A4333",
          900: "#2D3528",
        },
        // Pale Sage.
        sage: {
          50: "#F2F4EF",
          100: "#E6EAE0",
          200: "#C8D1C2", // Pale Sage
          300: "#ABB8A2",
          400: "#8E9D82",
          500: "#74835F",
          600: "#5C6A4C",
          700: "#47533B",
        },
        // Clay Beige.
        clay: {
          100: "#EEE5D9",
          200: "#E1D2BF",
          300: "#D2BBA0", // Clay Beige
          400: "#C0A689",
          500: "#A88B6C",
        },
      },
      fontFamily: {
        // Default heading font = "The Seasons" stand-in (Playfair Display).
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        // Brand display font = "Brown Sugar" stand-in (Fraunces) — logo + heroes.
        brand: ["var(--font-brand)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Brand-tinted shadows (warm olive undertone) read softer and more
        // premium than neutral gray.
        soft: "0 1px 2px rgba(45,45,45,0.04), 0 8px 24px -14px rgba(58,67,51,0.18)",
        lift: "0 2px 6px rgba(45,45,45,0.05), 0 22px 44px -20px rgba(58,67,51,0.30)",
        btn: "0 1px 2px rgba(45,45,45,0.08), 0 6px 16px -8px rgba(73,85,63,0.35)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
