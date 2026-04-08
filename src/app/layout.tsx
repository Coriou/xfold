import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ArchiveProvider } from "@/lib/archive/archive-store";
import { brand } from "@/lib/brand";
import { FAQ } from "@/lib/faq";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://xfold.app";
const REPO_URL = "https://github.com/Coriou/xfold";
const TWITTER_HANDLE = "@BenjaminCoriou";

const title = "xfold — See what X knows about you";
const titleTemplate = "%s — xfold";
const description =
  "Upload your X/Twitter data archive and see everything they collected about you. 100% client-side, open source, no tracking. Your archive never leaves your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: title,
    template: titleTemplate,
  },
  description,
  applicationName: "xfold",
  authors: [{ name: "Benjamin Coriou", url: "https://benjsmin.com" }],
  creator: "Benjamin Coriou",
  publisher: "xfold",
  keywords: [
    "X",
    "Twitter",
    "X archive",
    "Twitter archive",
    "data archive",
    "data export",
    "privacy",
    "privacy audit",
    "GDPR",
    "data subject access",
    "what does Twitter know about me",
    "open source",
    "client-side",
  ],
  category: "tool",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "xfold",
    title,
    description,
    url: SITE_URL,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "xfold dashboard preview — privacy score, advertiser tracking, and deleted tweets X kept",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: TWITTER_HANDLE,
    site: TWITTER_HANDLE,
    images: [
      {
        url: "/twitter-image",
        alt: "xfold dashboard preview — privacy score, advertisers paying for you, and deleted tweets X kept",
      },
    ],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "xfold",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: brand.background,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "xfold",
  alternateName: "xfold — X archive explorer",
  url: SITE_URL,
  description,
  applicationCategory: "UtilityApplication",
  applicationSubCategory: "Privacy tool",
  operatingSystem: "Any (web browser with Web Workers support)",
  browserRequirements: "Requires JavaScript and Web Workers",
  inLanguage: "en",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  creator: {
    "@type": "Person",
    name: "Benjamin Coriou",
    url: "https://benjsmin.com",
    sameAs: ["https://github.com/Coriou", "https://twitter.com/BenjaminCoriou"],
  },
  license: "https://opensource.org/licenses/MIT",
  codeRepository: REPO_URL,
  softwareVersion: "0.1.0",
  privacyPolicy: SITE_URL,
};

// Mirror of the visible FAQ on the landing page so the structured data
// matches what users actually read. Google flags FAQPage entries that
// don't match the rendered Q&A.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((entry) => ({
    "@type": "Question",
    name: entry.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: entry.a,
    },
  })),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body className="flex h-full flex-col">
        {/* Skip-to-main-content link for keyboard users. Hidden visually
            until focused; positioned absolute when visible so it doesn't
            disturb layout. The dashboard sidebar has 30+ buttons, so
            without this Tab order forces keyboard users through the whole
            navigation before reaching content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:text-background"
        >
          Skip to main content
        </a>
        <ArchiveProvider>{children}</ArchiveProvider>
      </body>
    </html>
  );
}
