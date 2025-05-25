import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'exchange.kuma.bid',
        port: '',
        pathname: '/static/images/**',
      },
    ],
  },
};

export default nextConfig;
