/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'crffl.org',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/hof',
        destination: 'https://crffl-hof.vercel.app',
      },
      {
        source: '/hof/:path*',
        destination: 'https://crffl-hof.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;

