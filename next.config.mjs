/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Vercel deployment
  output: 'standalone',

  // Suppress hydration warnings from browser extensions
  reactStrictMode: true,

  // Allow API calls to your backend domain
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
