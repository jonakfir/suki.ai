import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/recommendations", destination: "/shop", permanent: true },
      { source: "/today", destination: "/explore", permanent: true },
      { source: "/skin", destination: "/me", permanent: true },
      { source: "/hair", destination: "/me", permanent: true },
      { source: "/makeup", destination: "/me", permanent: true },
    ];
  },
};

export default nextConfig;
