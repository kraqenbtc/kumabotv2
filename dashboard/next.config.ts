import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'exchange.kuma.bid',
        pathname: '/coins/**',
      },
    ],
  },
};

export default nextConfig;
