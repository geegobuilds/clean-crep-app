import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sample photos (lib/work.ts SAMPLE_PHOTOS) come from Unsplash's image CDN.
  images: { remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }] },
};

export default nextConfig;
