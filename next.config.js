/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["bdmumdbykzbozgkxtsmk.supabase.co"],
  },
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
};

module.exports = nextConfig;
