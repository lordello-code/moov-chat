import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Imagens externas permitidas (WhatsApp CDN, etc.)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.whatsapp.net' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
};

export default nextConfig;
