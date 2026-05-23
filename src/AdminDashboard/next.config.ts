import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', 
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@icons-pack/react-simple-icons', 'motion', 'framer-motion', 'recharts'],
  },
};

export default nextConfig;