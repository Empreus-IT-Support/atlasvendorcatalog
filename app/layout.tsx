import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Vendor Catalog", description: "Scraped vendor product data for Atlas enrichment" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <strong>Vendor Catalog</strong>
          <nav>
            <Link href="/">Products</Link>
            <Link href="/vendors">Vendors</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
