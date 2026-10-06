import { MetadataRoute } from "next";

const BASE_URL = "https://www.alshariyaa.com";
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

// Static public pages — no admin, auth, checkout, cart, account
const staticRoutes: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "",              priority: 1.0, changeFrequency: "daily"   },
  { path: "/sim-cards",    priority: 0.9, changeFrequency: "daily"   },
  { path: "/routers",      priority: 0.9, changeFrequency: "daily"   },
  { path: "/all-products", priority: 0.8, changeFrequency: "daily"   },
  { path: "/about",        priority: 0.4, changeFrequency: "monthly" },
  // Category pages (slug-based)
  { path: "/stc",           priority: 0.8, changeFrequency: "daily"   },
  { path: "/mobily",        priority: 0.8, changeFrequency: "daily"   },
  { path: "/zain",          priority: 0.8, changeFrequency: "daily"   },
  { path: "/virgin",        priority: 0.8, changeFrequency: "daily"   },
  { path: "/salam",         priority: 0.7, changeFrequency: "daily"   },
  { path: "/sim-cards-cat", priority: 0.7, changeFrequency: "daily"   },
  { path: "/routers-cat",   priority: 0.7, changeFrequency: "daily"   },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    lastModified: now,
  }));

  // Dynamic product URLs — fetch only _id + updatedAt, limit 500
  let productUrls: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/products?limit=500&fields=_id,updatedAt`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const products: { _id: string; updatedAt?: string }[] = await res.json();
      if (Array.isArray(products)) {
        productUrls = products.map((p) => ({
          url: `${BASE_URL}/product/${p._id}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
          lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        }));
      }
    }
  } catch {
    // Backend unavailable at build time — sitemap still valid with static URLs
  }

  return [...staticUrls, ...productUrls];
}
