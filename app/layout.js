import "./globals.css";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
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
  verification: {
    google: "o6__oB0owp-GspKxtcwcds71VKIM_U2PX9b7umhZ5ZM",
  },
  alternates: { canonical: SITE.url },
};

export default function RootLayout({ children }) {
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: "Connect Shield LLC",
    url: SITE.url,
    description: SITE.description,
    logo: `${SITE.url}/connect-shield-mark.png`,
    telephone: "+14352246987",
    address: {
      "@type": "PostalAddress",
      streetAddress: "923 S River Rd",
      addressLocality: "St George",
      addressRegion: "UT",
      postalCode: "84790",
      addressCountry: "US",
    },
    sameAs: [],
  };
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
        <Nav />
        <main>{children}</main>
        <Footer />
        <Analytics />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0D8W0DXBWX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0D8W0DXBWX');
          `}
        </Script>
      </body>
    </html>
  );
}
