/** @type {import('next').NextConfig} */

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Packages that should not be bundled by webpack (use Node.js require at runtime)
  serverExternalPackages: ['pdf-parse'],

  // Configuración necesaria para despliegue con API routes
  output: undefined, // No usar export estático

  // Optimización de imágenes
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },

  // Optimización de compilación
  compiler: {
    // Eliminar console.log en producción
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Optimización experimental
  experimental: {
    // Optimiza el tree-shaking de paquetes
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash',
      'recharts',
    ],
  },

  // Headers de caché para assets estáticos
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones solo en producción
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: false,
            vendors: false,
            // El motor OCR sólo lo usa el escáner de tickets, que se carga con
            // un import dinámico. Sin esta regla el grupo `vendor` de abajo
            // (chunks: 'all', cualquier node_modules) se lo lleva al bundle
            // compartido y las 131 páginas cargan Tesseract sin usarlo nunca.
            tesseract: {
              name: 'tesseract',
              chunks: 'async',
              test: /[\\/]node_modules[\\/]tesseract\.js[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      }
    }
    return config
  },
}

module.exports = withBundleAnalyzer(nextConfig)
