import HeroSection from "./components/HeroSection";
import MostDemandedSection from "./components/MostDemandedSection";
import HomeCategorySections from "./components/HomeCategorySections";
import CustomerReviews from "./components/CustomerReviews";
import { getCompany } from "./lib/getCompany";

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const SITE_URL = "https://www.alshariyaa.com";

async function getReviews() {
  try {
    const res = await fetch(`${BACKEND}/api/admin/reviews`, {
      next: { revalidate: 3600, tags: ["reviews"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.reviews)
      ? data.reviews
      : [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [c, reviews] = await Promise.all([getCompany(), getReviews()]);

  const siteName = c.nameAr || "الشريحة الموثوقة";
  const logoUrl = c.logo
    ? c.logo.startsWith("http")
      ? c.logo
      : `${BACKEND}${c.logo}`
    : "";

  // Organization structured data
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    alternateName: c.nameEn || "alshariyaa",
    url: SITE_URL,
    logo: logoUrl || undefined,
    contactPoint: [
      c.phone
        ? {
            "@type": "ContactPoint",
            telephone: c.phone,
            contactType: "customer service",
            areaServed: "SA",
            availableLanguage: "Arabic",
          }
        : null,
      c.whatsapp
        ? {
            "@type": "ContactPoint",
            telephone: c.whatsapp,
            contactType: "sales",
            areaServed: "SA",
            availableLanguage: "Arabic",
          }
        : null,
    ].filter(Boolean),
    address: c.addressAr
      ? {
          "@type": "PostalAddress",
          addressLocality: c.addressAr,
          addressCountry: "SA",
        }
      : undefined,
    email: c.email || undefined,
    sameAs: c.website ? [c.website] : [],
  };

  // WebSite structured data with SearchAction
  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
      />
      <main className="min-h-screen">
        <HeroSection />
        <MostDemandedSection />
        <HomeCategorySections />
        <CustomerReviews initialReviews={reviews} />
      </main>
    </>
  );
}
