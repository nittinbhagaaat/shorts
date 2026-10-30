/** @type {import('next').NextConfig} */
const nextConfig = {
  // Speed up production builds on VPS by skipping duplicate linting & type checks
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  poweredByHeader: false,
};

export default nextConfig;
