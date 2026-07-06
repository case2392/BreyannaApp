import type { Metadata } from "next";
import { Fraunces, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

// Main display / heading font — closest free stand-in for Canva's "Brown Sugar":
// a warm, characterful boutique serif.
const serif = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

// Secondary "sub text" serif — closest free stand-in for Canva's "The Seasons":
// a high-contrast, elegant editorial serif. Used for taglines/subheadings.
const elegant = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-elegant",
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
      className={`${serif.variable} ${elegant.variable} ${sans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
