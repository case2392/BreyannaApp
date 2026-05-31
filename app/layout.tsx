import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Breyanna Fitness",
  description: "Book classes, manage your membership, and train with us.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
