/** netprophetapp.com. The v1 web app lived under /el and /en/...; its old links land on the new home. */
const nextConfig = {
  transpilePackages: ['@netprophet/tokens'],
  async redirects() {
    return [
      { source: '/el', destination: '/', permanent: true },
      { source: '/el/:path*', destination: '/', permanent: true },
      { source: '/en/:path((?!privacy|support).+)', destination: '/en', permanent: true },
    ];
  },
};

export default nextConfig;
