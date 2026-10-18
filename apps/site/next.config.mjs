/** netprophetapp.com. The v1 web app lived under /el and /en/...; its old links land on the new home. */
/** Security headers on every route: no framing, no MIME sniffing, a tight referrer. */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
  transpilePackages: ['@netprophet/tokens'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: '/el', destination: '/', permanent: true },
      { source: '/el/:path*', destination: '/', permanent: true },
      { source: '/en/:path((?!privacy|support).+)', destination: '/en', permanent: true },
    ];
  },
};

export default nextConfig;
