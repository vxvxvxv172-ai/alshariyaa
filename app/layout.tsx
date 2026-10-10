import type { Metadata, Viewport } from "next";
import Script from "next/script";
import TikTokPixel from "./components/TikTokPixel";
import SnapPixel from "./components/SnapPixel";
import "./globals.css";
import ClientLayout from "./components/ClientLayout";
import Footer from "./components/Footer";
import { getCompany } from "./lib/getCompany";
import { Analytics } from "@vercel/analytics/next";

// Single source of truth for the production domain
const SITE_URL = "https://www.alshariyaa.com";

export const viewport: Viewport = {
  themeColor: "#04454A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export async function generateMetadata(): Promise<Metadata> {
  const c = await getCompany();

  const siteName = c.nameAr || "الشريحة الموثوقة";
  const titleDefault = `${siteName} | أفضل متجر لبيع شرائح الاتصال في السعودية`;
  const description =
    c.details ||
    "الشريحة الموثوقة - تسوق أفضل شرائح الاتصال وباقات الإنترنت من فيرجن وSTC وزين وموبايلي بأسعار مميزة. توصيل سريع لجميع مناطق المملكة العربية السعودية.";
  const ogImage = `${SITE_URL}/logo.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: titleDefault,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: [
      "الشريحة الموثوقة",
      "alshariyaa",
      "بيع شرائح الاتصال",
      "شرائح اتصال",
      "باقات إنترنت",
      "شريحة SIM",
      "شريحة بيانات",
      "فيرجن موبايل",
      "Virgin Mobile",
      "STC",
      "زين",
      "موبايلي",
      "إنترنت مفتوح",
      "باقة شهرية",
      "باقة سنوية",
      "5G",
      "4G",
      "شريحة إنترنت",
      "باقة بيانات",
      "سوشيال مفتوح",
      "السعودية",
      "الرياض",
      "جدة",
      "مكة",
      "المدينة",
      "الدمام",
      "الخبر",
      "أرخص باقات الإنترنت",
      "عروض شرائح الاتصال",
    ],
    authors: [{ name: siteName, url: SITE_URL }],
    creator: siteName,
    publisher: siteName,
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "ar_SA",
      url: SITE_URL,
      siteName,
      title: titleDefault,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: siteName,
          type: "image/webp",
        },
        {
          url: `${SITE_URL}/web-app-manifest-512x512.png`,
          width: 512,
          height: 512,
          alt: siteName,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: [ogImage],
      creator: "@alshariyaa",
      site: "@alshariyaa",
    },
    alternates: {
      canonical: SITE_URL,
      languages: { "ar-SA": SITE_URL },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    },
    category: "electronics",
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const c = await getCompany();

  // GA4 Measurement ID — set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env.local
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Google Fonts: Cairo */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Preconnect to Image CDN */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Google Ads Conversion Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18484617025"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18484617025');
          `}
        </Script>

        {/* Google Analytics 4 — only loaded when Measurement ID is configured */}
        {gaMeasurementId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics-4" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        <TikTokPixel />
      </head>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <SnapPixel />
        <ClientLayout footer={<Footer />} whatsapp={c.whatsapp}>
          {children}
        </ClientLayout>
        <div
          className="sbc-verify-seal"
          data-token="UGdEMHMvZm1nSlJGN0ZnVmpYZEF0UT09"
          data-position="bottom-left"
        />
        {/* <Script
          id="saudi-business-verification-seal"
          src="https://eauthenticate.saudibusiness.gov.sa/EAuthSealApi/seal.js"
          strategy="lazyOnload"
        /> */}
        <Analytics />
      </body>
    </html>
  );
}
