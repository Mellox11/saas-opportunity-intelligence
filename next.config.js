// Environment validation is handled in the application startup

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs', 'jsonwebtoken'],
  },
}

module.exports = nextConfig