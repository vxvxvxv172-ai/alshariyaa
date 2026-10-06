import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import ProductPageClient from "./ProductPageClient";
import { getCompany } from "../../lib/getCompany";

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";
const SITE_URL = "https://www.alshariyaa.com";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${BACKEND}/api/products?limit=500&fields=_id`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const products: { _id: string }[] = await res.json();
    if (!Array.isArray(products)) return [];
    return products.map((p) => ({ id: p._id }));
  } catch {
    return [];
  }
}

const getProduct = cache(async (id: string) => {
  try {
    const r = await fetch(`${BACKEND}/api/products/${id}`, {
      next: { revalidate: 3600, tags: [`product_${id}`] },
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [product, company] = await Promise.all([getProduct(id), getCompany()]);

  if (!product) {
    return {
      title: "المنتج غير موجود",
      robots: { index: false, follow: false },
    };
  }

  const siteName = company.nameAr || "الشريحة الموثوقة";
  const productName = product.name;

  const parts: string[] = [];
  if (product.brand) parts.push(product.brand);
  if (product.storage) parts.push(product.storage);
  if (product.color) parts.push(product.color);
  if (product.salePrice || product.price) {
    parts.push(`${product.salePrice || product.price} ريال`);
  }

  const description = product.description
    ? product.description.slice(0, 160)
    : `اشتري ${productName}${parts.length ? " - " + parts.join(" | ") : ""} من ${siteName} بأفضل سعر مع شحن سريع لجميع مناطق المملكة`;

  const rawImg = product.images?.[0] || product.image || "";
  const imageUrl = rawImg
    ? rawImg.startsWith("http")
      ? rawImg
      : `${BACKEND}${rawImg}`
    : "";

  const canonicalUrl = `${SITE_URL}/product/${id}`;

  return {
    title: `${productName} | ${siteName}`,
    description,
    keywords: [
      product.name,
      product.brand || "",
      product.category || "",
      "شرائح اتصال",
      "باقات إنترنت",
      siteName,
    ].filter(Boolean),
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: `${productName} | ${siteName}`,
      description,
      images: imageUrl
        ? [{ url: imageUrl, width: 800, height: 800, alt: productName }]
        : [],
      siteName,
      locale: "ar_SA",
    },
    twitter: {
      card: "summary_large_image",
      title: `${productName} | ${siteName}`,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, company] = await Promise.all([getProduct(id), getCompany()]);

  if (!product) {
    notFound();
  }

  const siteName = company.nameAr || "الشريحة الموثوقة";
  const price = product?.salePrice || product?.price || 0;
  const rawImg = product?.images?.[0] || product?.image || "";
  const imageUrl = rawImg
    ? rawImg.startsWith("http")
      ? rawImg
      : `${BACKEND}${rawImg}`
    : "";

  // BreadcrumbList structured data
  const breadcrumbJsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "الرئيسية",
            item: SITE_URL,
          },
          product.category === "sim-cards"
            ? {
                "@type": "ListItem",
                position: 2,
                name: "شرائح الاتصال",
                item: `${SITE_URL}/sim-cards`,
              }
            : product.category === "routers"
            ? {
                "@type": "ListItem",
                position: 2,
                name: "راوترات",
                item: `${SITE_URL}/routers`,
              }
            : {
                "@type": "ListItem",
                position: 2,
                name: "جميع المنتجات",
                item: `${SITE_URL}/all-products`,
              },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: `${SITE_URL}/product/${id}`,
          },
        ],
      }
    : null;

  // Product structured data
  const productJsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || product.name,
        image: imageUrl || undefined,
        sku: product._id,
        brand: product.brand
          ? { "@type": "Brand", name: product.brand }
          : undefined,
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/product/${id}`,
          priceCurrency: "SAR",
          price: price,
          availability:
            product.inStock !== false
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: { "@type": "Organization", name: siteName },
        },
      }
    : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      )}
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductPageClient id={id} initialProduct={product} />
    </>
  );
}
