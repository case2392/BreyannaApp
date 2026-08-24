import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { PromoPopup } from "@/components/PromoPopup";

// Brand display font — the real "Brown Sugar" (Muntab Art), a single-weight
// display face. Reserved for the logo/wordmark and the big hero headlines.
const brand = localFont({
  src: "../public/fonts/brown-sugar.ttf",
  weight: "400",
  variable: "--font-brand",
  display: "swap",
});

// Default heading serif — Playfair Display, a fully-licensed, watermark-free
// stand-in for "The Seasons": a high-contrast, elegant editorial serif. Used
// for all other headings, sub-titles, and taglines.
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dwell Studio",
  description:
    "A Christ-centered movement studio for women to worship, workout, and grow closer to Jesus. Honoring the body as God's dwelling place through cycle, movement, and dance.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom up to 5x for accessibility (WCAG 1.4.4 / 1.4.10).
  maximumScale: 5,
  themeColor: "#F4F1EC",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${brand.variable} ${serif.variable} ${sans.variable}`}
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        {children}
        <PromoPopup />
      </body>
    </html>
  );
}
