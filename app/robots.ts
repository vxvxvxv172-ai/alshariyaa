import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Googlebot, Googlebot-Image, Storebot-Google, AdsBot: full access to products and images
      {
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Storebot-Google",
          "AdsBot-Google",
          "AdsBot-Google-Mobile",
        ],
        allow: ["/", "/_next/image"],
        disallow: ["/admin/", "/api/", "/checkout/", "/account/", "/auth/"],
      },
      // All other bots
      {
        userAgent: "*",
        allow: ["/", "/_next/image"],
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
          "/_next/static/",
        ],
      },
    ],
    sitemap: "https://www.alshariyaa.com/sitemap.xml",
  };
}
