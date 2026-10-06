import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/checkout/",
        "/checkout/verify/",
        "/account/",
        "/auth/",
        "/cart/",
        "/search/",
        "/file-view/",
        "/maintenance/",
        "/_next/",
      ],
    },
    sitemap: "https://www.alshariyaa.com/sitemap.xml",
  };
}
