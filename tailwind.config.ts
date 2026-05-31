import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral / espresso — used for text, surfaces and the cream bg.
        ink: {
          50: "#FAF6F0",
          100: "#F2EADF",
          200: "#E7DAC9",
          300: "#D5C2A9",
          400: "#AC9580",
          500: "#86715D",
          600: "#6B594A",
          700: "#4E4035",
          800: "#362C24",
          900: "#261E18",
        },
        // Primary accent — a soft berry-rose that complements the sunset logo.
        brand: {
          50: "#FDECEF",
          100: "#FAD6DE",
          200: "#F3AEBC",
          300: "#EB8398",
          400: "#E15C7B",
          500: "#D43E63",
          600: "#BE3358",
          700: "#9E2A49",
          800: "#7C2540",
          900: "#5E1E32",
        },
        // Secondary accent — the sage green from the Dwell brand.
        sage: {
          50: "#F2F3EC",
          100: "#E4E7D6",
          200: "#CBD0B2",
          300: "#AEB58A",
          400: "#939B69",
          500: "#7C8454",
          600: "#636B43",
          700: "#4C5234",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(38,30,24,0.04), 0 8px 24px -12px rgba(38,30,24,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
