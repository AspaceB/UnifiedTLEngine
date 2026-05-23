import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHL Unified Talent Intelligence Engine",
  description:
    "Composite inference layer that unifies OPQ32, Verify G+, and AMCAT into a single talent profile.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
