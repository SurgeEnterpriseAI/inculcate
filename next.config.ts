import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root (several lockfiles exist on this machine).
  outputFileTracingRoot: __dirname,
  experimental: {
    // Server Actions are enabled by default in Next 15; kept explicit for clarity.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
