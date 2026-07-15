import "./globals.css";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Connect Shield — Hospice Compliance Intelligence & SSVI Score Lookup",
    template: "%s — Connect Shield",
  },
  description: SITE.description,
  keywords: [
    "hospice compliance", "SSVI score", "hospice SSVI", "PEPPER report", "CAHPS hospice survey",
    "hospice QAPI", "PS&R summary", "hospice beneficiary count", "hospice survey results",
    "hospice CAP exposure", "CMS hospice data",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: "Connect Shield — Hospice Compliance Intelligence",
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", title: "Connect Shield", description: SITE.description },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
};

export default function RootLayout({ children }) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    sameAs: [],
  };
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
