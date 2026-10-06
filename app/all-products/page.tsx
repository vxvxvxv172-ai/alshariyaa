import { Suspense } from "react";
import AllProductsClient from "./AllProductsClient";
import type { Product } from "../components/products/types";
import { sortProducts } from "../lib/sortProducts";
import type { Metadata } from "next";

const SITE_URL = "https://www.alshariyaa.com";
const SITE_NAME = "الشريحة الموثوقة";

export const metadata: Metadata = {
  title: `جميع الشرائح والمنتجات | ${SITE_NAME}`,
  description:
    "تصفح جميع شرائح الاتصال وباقات الإنترنت بأفضل الأسعار من الشريحة الموثوقة. STC وموبايلي وزين وفيرجن وسلام.",
  alternates: {
    canonical: `${SITE_URL}/all-products`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/all-products`,
    title: `جميع الشرائح والمنتجات | ${SITE_NAME}`,
    description:
      "تصفح جميع شرائح الاتصال وباقات الإنترنت بأفضل الأسعار من الشريحة الموثوقة.",
    siteName: SITE_NAME,
    locale: "ar_SA",
  },
};

export const revalidate = 3600;

async function getAllProducts(): Promise<Product[]> {
  const BACKEND =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000";
  try {
    const res = await fetch(`${BACKEND}/api/products?cardOnly=true`, {
      next: { revalidate: 3600, tags: ["products"] },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
      ? data.products
      : [];
  } catch {
    return [];
  }
}

export default async function AllProductsPage() {
  const rawProducts = await getAllProducts();
  const products = sortProducts(rawProducts, false);

  return (
    <Suspense>
      <AllProductsClient initialProducts={products} />
    </Suspense>
  );
}
