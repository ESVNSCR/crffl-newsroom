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
};

export default nextConfig;
