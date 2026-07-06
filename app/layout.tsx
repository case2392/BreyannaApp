import type { Metadata } from "next";
import { Fraunces, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Brand display font — closest free stand-in for Canva's "Brown Sugar":
// a warm, characterful boutique serif. Reserved for the logo/wordmark and
// the big hero headlines.
const brand = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-brand",
  display: "swap",
});

// Default heading serif — closest free stand-in for Canva's "The Seasons":
// a high-contrast, elegant editorial serif. Used for all other headings,
// sub-titles, and taglines.
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
  maximumScale: 1,
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
      <body>{children}</body>
    </html>
  );
}
