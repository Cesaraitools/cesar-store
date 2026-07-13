/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["bdmumdbykzbozgkxtsmk.supabase.co"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.cesareshop.com",
      },
      {
        protocol: "https",
        hostname: "cesareshop.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
  },
  async headers() {
    const longLivedStaticAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    const catalogAssetHeaders = [
      {
        key: "Cache-Control",
        value: "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=604800",
      },
    ];

    return [
      {
        source: "/slides/:path*",
        headers: longLivedStaticAssetHeaders,
      },
      {
        source: "/products/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/categories/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/uploads/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/promos/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/collecting/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/credits/:path*",
        headers: catalogAssetHeaders,
      },
      {
        source: "/fonts/:path*",
        headers: longLivedStaticAssetHeaders,
      },
      {
        source: "/navlogo.png",
        headers: longLivedStaticAssetHeaders,
      },
      {
        source: "/logo-v2.png",
        headers: longLivedStaticAssetHeaders,
      },
      {
        source: "/placeholder.png",
        headers: longLivedStaticAssetHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "cesareshop.com",
          },
        ],
        destination: "https://www.cesareshop.com/:path*",
        permanent: true,
      },
    ];
  },
  experimental: {
    outputFileTracingExcludes: {
      "/api/upload": ["./.git/**/*", "./.next/cache/**/*", "./public/**/*"],
      "/api/products": ["./.git/**/*", "./.next/cache/**/*", "./public/**/*"],
      "/api/admin/products/import": [
        "./.git/**/*",
        "./.next/cache/**/*",
        "./public/**/*",
      ],
      "/api/admin/products/import/*": [
        "./.git/**/*",
        "./.next/cache/**/*",
        "./public/**/*",
      ],
    },
  },
};

module.exports = nextConfig;


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "cesar-store",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
