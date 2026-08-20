import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    serverActions: {
      allowedOrigins: ["casarium-production.up.railway.app"],
    },
  },
};

export default nextConfig;
