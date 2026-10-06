import { TrendingUp } from "lucide-react";
import type { Product } from "./products/types";
import ProductCard from "./products/ProductCard";

// الـ IDs المطلوبة — تُرسل كـ query واحدة بدل 4 requests منفصلة
const IDS = [
  "6a943492832465e62427be05",
  "6a9437e6cd7da0bf04e86916",
  "6a9430ba2f39401999e29c50",
  "6a94389df64d29e186524b77",
];

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "https://alshareehaa-backend.vercel.app";

// Fix 7: request واحدة بدل 4 — /api/products/by-ids?ids=id1,id2,id3,id4
async function getMostDemanded(): Promise<Product[]> {
  try {
    const idsParam = IDS.join(",");
    const res = await fetch(`${BACKEND}/api/products/by-ids?ids=${idsParam}`, {
      next: { revalidate: 3600, tags: ["products"] },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function MostDemandedSection() {
  const products = await getMostDemanded();
  if (products.length === 0) return null;

  return (
    <section dir="rtl" className="w-full px-2 sm:px-6 lg:px-8 py-8 sm:py-14">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6 sm:mb-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 rounded-full bg-[#284064]" />
            <div>
              <h2 className="text-xl sm:text-3xl font-black text-gray-900">الأكثر طلباً</h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5">منتجات يختارها عملاؤنا باستمرار</p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(40,64,100,0.1)", border: "1px solid rgba(40,64,100,0.25)" }}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#284064]" />
            <span className="text-[#284064] text-xs font-bold">الأعلى مبيعاً</span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
          {products.map((p, i) => (
            <ProductCard key={p._id} product={p} priority={i < 2} />
          ))}
        </div>

      </div>
    </section>
  );
}
