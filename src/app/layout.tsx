import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/lib/fontawesome";
import { BRAND } from "@/lib/constants";
import { getAppUrl } from "@/lib/env";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { TawkChat } from "@/components/tawk/TawkChat";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const appUrl = getAppUrl();
const shareTitle = `${BRAND.name} — ${BRAND.tagline}`;
const shareDescription = BRAND.description;
const ogImageAlt = `${BRAND.fullName} — ${BRAND.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: shareTitle,
    template: `%s | ${BRAND.name}`,
  },
  description: shareDescription,
  applicationName: BRAND.fullName,
  keywords: [
    "crypto exchange",
    "bitcoin trading",
    "copy trading",
    "AI trading",
    "forex trading",
    BRAND.name,
    BRAND.domain,
  ],
  authors: [{ name: BRAND.fullName, url: appUrl }],
  creator: BRAND.fullName,
  publisher: BRAND.fullName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: BRAND.fullName,
    title: shareTitle,
    description: shareDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: ogImageAlt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: [
      {
        url: "/twitter-image",
        width: 1200,
        height: 630,
        alt: ogImageAlt,
      },
    ],
  },
  icons: {
    icon: [{ url: "/icon", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-icon", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "black-translucent",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: appUrl,
  },
  category: "finance",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f0f0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh w-full antialiased bg-bg-primary text-text-primary">
        <ThemeProvider>
          <PwaProvider>
            <I18nProvider>
              {children}
              <TawkChat />
            </I18nProvider>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
