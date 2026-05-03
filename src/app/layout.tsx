import type { Metadata } from "next";
import "./globals.css";
import Navbar2 from "./components/navbar2";
import Footer from "./components/footer";

const assetsOrigin = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";
const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";
const siteName = "Prestige Kitchens & Bedrooms";
const siteDescription =
  "Plan fitted kitchens, bedrooms, appliances, sinks, taps, and installed interiors with Prestige Kitchens & Bedrooms in Ferndown, Dorset.";
const contactNumbers = ["+447765504961", "+447887241451"];

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": `${siteUrl}/#business`,
  name: siteName,
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: [`${siteUrl}/heroimage.png`, `${siteUrl}/heroimage2.png`],
  telephone: contactNumbers,
  email: "info@prestigekitchensandbedrooms.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Unit 13 Telford Road",
    addressLocality: "Ferndown, Wimborne",
    postalCode: "BH21 7QP",
    addressCountry: "GB",
  },
  areaServed: ["Ferndown", "Wimborne", "Dorset", "Bournemouth", "Poole"],
  sameAs: [
    "https://www.instagram.com/prestige_kitchensandbedrooms/",
    "https://www.facebook.com/profile.php?id=61585955789857",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: `${siteName} | Fitted Kitchens & Bedrooms in Dorset`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "fitted kitchens Dorset",
    "kitchen showroom Ferndown",
    "fitted bedrooms Dorset",
    "Prestige Kitchens and Bedrooms",
    "kitchen design consultation",
    "kitchen appliances Dorset",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName,
    title: `${siteName} | Fitted Kitchens & Bedrooms in Dorset`,
    description: siteDescription,
    url: siteUrl,
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/heroimage.png",
        width: 1200,
        height: 1200,
        alt: "Prestige fitted kitchen design",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Fitted Kitchens & Bedrooms in Dorset`,
    description: siteDescription,
    images: ["/heroimage.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {assetsOrigin ? (
          <>
            <link rel="preconnect" href={assetsOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={assetsOrigin} />
          </>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      <body>
        <a href="#main-content" className="skipLink">
          Skip to main content
        </a>
        <Navbar2 />
        <div id="main-content" className="contentWrapper" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
