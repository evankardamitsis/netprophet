import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v2 workspace packages ship TypeScript source
  transpilePackages: ["@netprophet/db", "@netprophet/core", "@netprophet/tokens"],
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["src"],
  },
  compiler: {
    // Remove console.log in production (keep error and warn)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },
};

export default nextConfig;
