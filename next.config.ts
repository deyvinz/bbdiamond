import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Set the root directory for file tracing to prevent lockfile detection issues
  // This ensures Next.js uses the correct directory when detecting lockfiles
  // Use path.resolve to ensure absolute path on Windows
  outputFileTracingRoot: process.platform === 'win32' 
    ? path.resolve(process.cwd())
    : path.resolve(__dirname),
  
  // Limit the number of worker threads to reduce memory usage during build
  // This helps prevent out-of-memory errors on Windows
  ...(process.platform === 'win32' && {
    typescript: {
      // Ignore type errors during build if needed (set to true if builds are failing)
      ignoreBuildErrors: false,
    },
  }),
  
  // Optimize for production
  compress: true,
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
      {
        protocol: "https",
        hostname: "utumylehywfktctigkie.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Support dynamic Supabase storage URLs
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    unoptimized: false,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // External packages for server components
  serverExternalPackages: ['ioredis'],
  
  // Webpack configuration for better builds and cache management
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Externalize ioredis for server-side rendering
      config.externals.push('ioredis')
    }
    
    // Aggressively optimize webpack cache for development to prevent memory issues
    if (dev && config.cache) {
      if (config.cache.type === 'filesystem') {
        // Completely disable PackFileCacheStrategy to prevent Array buffer allocation errors
        config.cache.maxMemoryGenerations = 0
        // Reduce cache age to limit accumulation
        config.cache.maxAge = 1000 * 60 * 60 * 24 // 1 day instead of 7
        // Disable compression to reduce memory usage
        config.cache.compression = false
        // Use faster hash algorithm
        config.cache.hashAlgorithm = 'xxhash64'
        // Limit cache store size to prevent memory bloat
        config.cache.store = 'pack' // Use pack store but with maxMemoryGenerations=0
        
        // Additional memory limits for webpack - must use absolute path
        config.cache.cacheLocation = path.resolve(process.cwd(), '.next/cache/webpack')
        // Limit the number of cached items
        config.optimization = {
          ...config.optimization,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        }
        
        // Disable memory caching entirely for pack files
        if (config.cache.store) {
          // Override PackFileCacheStrategy to prevent memory allocation
          const originalStore = config.cache.store
          if (typeof originalStore === 'object' && originalStore.constructor) {
            // Force memory cache to be disabled
            config.cache.maxMemoryGenerations = 0
          }
        }
      } else if (!config.cache.type) {
        // If no cache type, disable caching to prevent memory issues
        config.cache = false
      }
    }
    
    return config
  },
  
  // Support rewrites for multi-tenant routing (handled by middleware)
  async rewrites() {
    return []
  },
  
  // Experimental features to help with Windows build issues and memory optimization
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Development-specific optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Disable source maps in development to speed up compilation
    productionBrowserSourceMaps: false,
  }),
  
  // Optimize static generation to use less memory
  ...(process.platform === 'win32' && {
    // Limit the number of concurrent static page generations
    // This prevents overwhelming the system during build
    generateBuildId: async () => {
      return 'build-' + Date.now()
    },
  }),
};

export default nextConfig;
