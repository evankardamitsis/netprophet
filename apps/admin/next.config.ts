import type { NextConfig } from "next";

/** Security headers on every route: no framing, no MIME sniffing, a tight referrer. */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // v2 workspace packages ship TypeScript source
  transpilePackages: ["@netprophet/db", "@netprophet/core", "@netprophet/copy", "@netprophet/tokens", "@netprophet/ingest"],
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
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
