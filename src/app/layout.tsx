import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inculcate — Study Abroad, Intelligently",
  description:
    "AI-assisted study-abroad platform. AI elevates, humans execute — discovery and matching by AI, applications and logistics by expert counselors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
