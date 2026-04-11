/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 🔥 FIX: السماح بصور Supabase
  images: {
    domains: ["bdmumdbykzbozgkxtsmk.supabase.co"],
  },
};

module.exports = nextConfig;
