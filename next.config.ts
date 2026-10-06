import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Consistent canonical URLs — no trailing slash
  trailingSlash: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [32, 64, 96, 128, 256, 384],
    qualities: [75, 80],
    remotePatterns: [
      { hostname: "ibb.co" },
      { hostname: "i.ibb.co" },
      { protocol: "http", hostname: "localhost", port: "5000" },
      { protocol: "http", hostname: "localhost", port: "3000" },
      { protocol: "https", hostname: "**.vercel.app" },
      { protocol: "https", hostname: "**.railway.app" },
      { protocol: "https", hostname: "**.render.com" },
      { protocol: "https", hostname: "**.onrender.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
