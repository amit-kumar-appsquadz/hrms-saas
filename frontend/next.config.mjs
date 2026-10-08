/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tenant is resolved from the subdomain in middleware (ADR-001).
  // Images are not optimized for the demo (no remote image hosts configured).
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
