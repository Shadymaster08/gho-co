/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Playwright is local-only (needs a display). Don't bundle it on Vercel.
    serverComponentsExternalPackages: ['playwright', 'playwright-core', 'sharp'],
  },
};

export default nextConfig;
