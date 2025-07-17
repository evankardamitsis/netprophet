/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@netprophet/ui", "@netprophet/lib"],
  experimental: {
    // Avoid micromatch stack overflow issues
    esmExternals: "loose",
  },
  // Ensure proper build optimization
  swcMinify: true,
};

module.exports = nextConfig;
