/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright is local-only (needs a display). Don't bundle it on Vercel.
  serverExternalPackages: ['playwright', 'playwright-core'],
};

export default nextConfig;
