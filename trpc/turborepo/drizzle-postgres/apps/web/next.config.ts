import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/trpc"],
};

export default nextConfig;
