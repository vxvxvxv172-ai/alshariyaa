import SimCardsClient from "./SimCardsClient";
import type { Product } from "../components/products/types";
import { sortProducts } from "../lib/sortProducts";
import type { Metadata } from "next";

const SITE_URL = "https://www.alshariyaa.com";
const SITE_NAME = "الشريحة الموثوقة";

export const metadata: Metadata = {
  title: `شرائح الاتصال | ${SITE_NAME}`,
  description:
    "اختر شريحتك المناسبة من جميع شركات الاتصالات السعودية: STC وموبايلي وزين وفيرجن وسلام. تمتع باتصال سريع وتغطية قوية في كل مكان.",
  alternates: {
    canonical: `${SITE_URL}/sim-cards`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/sim-cards`,
    title: `شرائح الاتصال | ${SITE_NAME}`,
    description:
      "اختر شريحتك المناسبة من جميع شركات الاتصالات السعودية. تمتع باتصال سريع وتغطية قوية.",
    siteName: SITE_NAME,
    locale: "ar_SA",
  },
};

export const revalidate = 3600;

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

async function getSimCards(): Promise<Product[]> {
  try {
    const res = await fetch(
      `${BACKEND}/api/products?category=sim-cards&cardOnly=true`,
      {
        next: { revalidate: 3600, tags: ["sim-cards", "products"] },
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const raw = Array.isArray(data)
      ? data
      : Array.isArray(data?.products)
      ? data.products
      : [];
    return sortProducts(raw);
  } catch {
    return [];
  }
}

export default async function SimCardsPage() {
  const products = await getSimCards();
  return <SimCardsClient initialProducts={products} />;
}
