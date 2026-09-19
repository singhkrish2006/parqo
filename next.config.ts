import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Leaflet's map container can't survive React StrictMode's dev-only
  // double-mount (it throws "Map container is being reused").
  reactStrictMode: false,
};

export default nextConfig;
