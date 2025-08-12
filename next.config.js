/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'jsonwebtoken'],
  },
  eslint: {
    // For production build, ignore ESLint errors temporarily
    ignoreDuringBuilds: true,
  },
  typescript: {
    // For production build, ignore TypeScript errors temporarily  
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig