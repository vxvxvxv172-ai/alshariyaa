import Link from "next/link";
import { Tag } from "lucide-react";
import type { Product } from "./products/types";
import ProductCard from "./products/ProductCard";
import { sortProducts } from "../lib/sortProducts";

type BrandSetting = {
  brand: string;
  showInHome: boolean;
  order: number;
  bannerImages?: string[];
};

type BrandSection = {
  brand: string;
  products: Product[];
  bannerImages?: string[];
};

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function getSections(): Promise<BrandSection[]> {
  try {
    // 1. Try single consolidated endpoint (1 backend request instead of 1 + N)
    const singleRes = await fetch(`${BACKEND}/api/products/home-sections`, {
      next: { revalidate: 3600, tags: ["home_sections", "products"] },
      signal: AbortSignal.timeout(3000),
    });
    if (singleRes.ok) {
      const data = await singleRes.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {
    // Fallback below
  }

  try {
    // 2. Fallback to existing settings + multi-product fetch
    const settingsRes = await fetch(`${BACKEND}/api/admin/brands/home-settings`, {
      next: { revalidate: 3600, tags: ["brands-settings"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!settingsRes.ok) return [];

    const settings: BrandSetting[] = await settingsRes.json();
    const visible = settings.filter((s) => s.showInHome).sort((a, b) => a.order - b.order);
    if (visible.length === 0) return [];

    const results = await Promise.all(
      visible.map(async (s) => {
        const res = await fetch(
          `${BACKEND}/api/products?brand=${encodeURIComponent(s.brand)}`,
          { next: { revalidate: 3600, tags: ["products"] }, signal: AbortSignal.timeout(3000) }
        );
        const data = res.ok ? await res.json() : [];
        const raw: Product[] = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
        const products = sortProducts(raw, true).slice(0, 4);
        return { brand: s.brand, products, bannerImages: s.bannerImages || [] };
      })
    );

    return results.filter((s) => s.products.length > 0);
  } catch {
    return [];
  }
}

export default async function HomeCategorySections() {
  const sections = await getSections();
  if (sections.length === 0) return null;

  return (
    <>
      {sections.map((sec) => (
        <section key={sec.brand} dir="rtl" className="w-full px-3 sm:px-6 lg:px-8 py-8 sm:py-14">
          <div className="max-w-6xl mx-auto">

            {sec.bannerImages && sec.bannerImages.length > 0 && (
              <div className="mb-6 sm:mb-10 rounded-2xl overflow-hidden flex flex-col gap-3">
                {sec.bannerImages.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={sec.brand}
                    loading="lazy"
                    decoding="async"
                    className="w-full object-cover"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mb-6 sm:mb-10">
              <div className="flex items-center gap-3">
                <div className="w-1 h-7 rounded-full bg-[#284064]" />
                <div>
                  <h2 className="text-xl sm:text-3xl font-black text-gray-900">{sec.brand}</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">أفضل المنتجات في هذه الفئة</p>
                </div>
              </div>
              <Link
                href={`/all-products?brand=${encodeURIComponent(sec.brand)}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "rgba(40,64,100,0.1)", border: "1px solid rgba(40,64,100,0.25)" }}
              >
                <Tag className="w-3.5 h-3.5 text-[#284064]" />
                <span className="text-[#284064] text-xs font-bold">عرض الكل</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {sec.products.map((p) => (
                <ProductCard key={p._id} product={p} priority={false} />
              ))}
            </div>

          </div>
        </section>
      ))}
    </>
  );
}
