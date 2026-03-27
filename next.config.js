/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🔥 FIX: السماح بصور Supabase
  images: {
    domains: ["bdmumdbykzbozgkxtsmk.supabase.co"],
  },
};

module.exports = nextConfig;