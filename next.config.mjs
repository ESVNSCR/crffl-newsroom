/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'crffl.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'store.crffl.org',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/wp-admin',
        destination: 'https://store.crffl.org/wp-admin/',
        permanent: false,
      },
      {
        source: '/wp-admin/:path*',
        destination: 'https://store.crffl.org/wp-admin/:path*',
        permanent: false,
      },
      {
        source: '/wp-login.php',
        destination: 'https://store.crffl.org/wp-login.php',
        permanent: false,
      },
      {
        source: '/shop',
        destination: 'https://store.crffl.org/shop/',
        permanent: false,
      },
      {
        source: '/shop/:path*',
        destination: 'https://store.crffl.org/shop/:path*',
        permanent: false,
      },
      {
        source: '/product/:path*',
        destination: 'https://store.crffl.org/product/:path*',
        permanent: false,
      },
      {
        source: '/product-category/:path*',
        destination: 'https://store.crffl.org/product-category/:path*',
        permanent: false,
      },
      {
        source: '/cart',
        destination: 'https://store.crffl.org/cart/',
        permanent: false,
      },
      {
        source: '/cart/:path*',
        destination: 'https://store.crffl.org/cart/:path*',
        permanent: false,
      },
      {
        source: '/checkout',
        destination: 'https://store.crffl.org/checkout/',
        permanent: false,
      },
      {
        source: '/checkout/:path*',
        destination: 'https://store.crffl.org/checkout/:path*',
        permanent: false,
      },
      {
        source: '/my-account',
        destination: 'https://store.crffl.org/my-account/',
        permanent: false,
      },
      {
        source: '/my-account/:path*',
        destination: 'https://store.crffl.org/my-account/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/hof',
          destination: 'https://crffl-hof.vercel.app/hof',
        },
        {
          source: '/hof/:path*',
          destination: 'https://crffl-hof.vercel.app/hof/:path*',
        },
      ],
      afterFiles: [
        {
          source: '/logos/:path*',
          destination: 'https://crffl-hof.vercel.app/logos/:path*',
        },
        // Proxy static WordPress uploads/assets and REST API
        {
          source: '/wp-content/:path*',
          destination: 'https://store.crffl.org/wp-content/:path*',
        },
        {
          source: '/wp-includes/:path*',
          destination: 'https://store.crffl.org/wp-includes/:path*',
        },
        {
          source: '/wp-json/:path*',
          destination: 'https://store.crffl.org/wp-json/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
