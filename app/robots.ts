import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Googlebot and Googlebot-Image: full access to products and images
      {
        userAgent: ["Googlebot", "Googlebot-Image"],
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/account/", "/auth/"],
      },
      // All other bots
      {
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
          "/maintenance/",
          "/_next/",
        ],
      },
    ],
    sitemap: "https://www.alshariyaa.com/sitemap.xml",
  };
}
