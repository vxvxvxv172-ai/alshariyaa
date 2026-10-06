import type { Metadata } from "next";
import { slugConfigs } from "../../lib/categoryConfig";
import { sortProducts } from "../../lib/sortProducts";
import type { Product } from "../../components/products/types";
import CategoryPageClient from "./CategoryPageClient";

const SITE_URL = "https://www.alshariyaa.com";
const SITE_NAME = "الشريحة الموثوقة";
const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(slugConfigs).map((slug) => ({ slug }));
}

function filterProducts(products: Product[], slug: string): Product[] {
  const config = slugConfigs[slug];
  if (!config) return products;
  const { brand, category, nameIncludes, nameExcludes } = config.filters;
  return products.filter((p) => {
    const matchBrand = brand
      ? p.brand?.toLowerCase() === brand.toLowerCase()
      : true;
    const matchCategory = category ? p.category === category : true;
    const matchName = nameIncludes?.length
      ? nameIncludes.some((kw) =>
          p.name?.toLowerCase().includes(kw.toLowerCase())
        )
      : true;
    const matchExclude = nameExcludes?.length
      ? !nameExcludes.some((kw) =>
          p.name?.toLowerCase().includes(kw.toLowerCase())
        )
      : true;
    return matchBrand && matchCategory && matchName && matchExclude;
  });
}

async function getCategoryProducts(slug: string): Promise<Product[]> {
  try {
    const config = slugConfigs[slug];
    const brand = config?.filters?.brand ?? "";
    const query = brand
      ? `?brand=${encodeURIComponent(brand)}&cardOnly=true`
      : "?cardOnly=true";
    const res = await fetch(`${BACKEND}/api/products${query}`, {
      next: { revalidate: 3600, tags: ["category-products", `category-${slug}`] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data: Product[] = await res.json();
    return sortProducts(filterProducts(data, slug));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const config = slugConfigs[slug];

  const label = config?.label ?? slug;
  const parentLabel = config?.parentLabel ?? "";

  const title = parentLabel
    ? `${label} - ${parentLabel} | ${SITE_NAME}`
    : `${label} | ${SITE_NAME}`;

  const description = `تسوق ${label} بأفضل الأسعار من ${SITE_NAME}. ${
    parentLabel ? `ضمن قسم ${parentLabel}.` : ""
  } شحن سريع لجميع مناطق المملكة وضمان معتمد على جميع المنتجات.`;

  const canonicalUrl = `${SITE_URL}/${slug}`;

  return {
    title,
    description,
    keywords: [label, parentLabel, SITE_NAME, "شرائح اتصال", "السعودية"].filter(
      Boolean
    ),
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: SITE_NAME,
      locale: "ar_SA",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function CategorySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = slugConfigs[slug];
  const initialProducts = await getCategoryProducts(slug);

  const label = config?.label ?? slug;
  const parentLabel = config?.parentLabel ?? "";
  const parentHref = config?.parentHref ?? "/";

  // BreadcrumbList structured data
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "الرئيسية",
        item: SITE_URL,
      },
      parentLabel && parentHref !== "/"
        ? {
            "@type": "ListItem",
            position: 2,
            name: parentLabel,
            item: `${SITE_URL}${parentHref}`,
          }
        : null,
      {
        "@type": "ListItem",
        position: parentLabel ? 3 : 2,
        name: label,
        item: `${SITE_URL}/${slug}`,
      },
    ].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryPageClient slug={slug} initialProducts={initialProducts} />
    </>
  );
}
