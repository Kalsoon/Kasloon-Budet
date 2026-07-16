import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost.", "repair.localhost"],
  reactStrictMode: true,
};

export default nextConfig;
