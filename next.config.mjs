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
      // WooCommerce & WordPress routes proxied to SiteGround
      {
        source: '/shop',
        destination: 'https://store.crffl.org/shop/',
      },
      {
        source: '/shop/:path*',
        destination: 'https://store.crffl.org/shop/:path*',
      },
      {
        source: '/product/:path*',
        destination: 'https://store.crffl.org/product/:path*',
      },
      {
        source: '/product-category/:path*',
        destination: 'https://store.crffl.org/product-category/:path*',
      },
      {
        source: '/cart',
        destination: 'https://store.crffl.org/cart/',
      },
      {
        source: '/cart/:path*',
        destination: 'https://store.crffl.org/cart/:path*',
      },
      {
        source: '/checkout',
        destination: 'https://store.crffl.org/checkout/',
      },
      {
        source: '/checkout/:path*',
        destination: 'https://store.crffl.org/checkout/:path*',
      },
      {
        source: '/my-account',
        destination: 'https://store.crffl.org/my-account/',
      },
      {
        source: '/my-account/:path*',
        destination: 'https://store.crffl.org/my-account/:path*',
      },
      {
        source: '/wp-admin/:path*',
        destination: 'https://store.crffl.org/wp-admin/:path*',
      },
      {
        source: '/wp-login.php',
        destination: 'https://store.crffl.org/wp-login.php',
      },
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
    ];
  },
};

export default nextConfig;

