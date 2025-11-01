import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utumylehywfktctigkie.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Support dynamic Supabase storage URLs
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Support rewrites for multi-tenant routing (handled by middleware)
  async rewrites() {
    return []
  },
};

export default nextConfig;
