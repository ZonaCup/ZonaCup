/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'pub-2fdbbbf47ae84eda92735b336535455e.r2.dev' },
    ],
  },
};

module.exports = nextConfig;
