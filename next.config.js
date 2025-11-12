/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🔒 프로덕션 빌드 시 모든 console 자동 제거 (보안 강화)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'] // error와 warn만 유지 (디버깅용)
    } : false
  },

  // ⚡ 성능 최적화: 번들 크기 감소 (30-50% 개선 예상)
  experimental: {
    // Tree Shaking 최적화: 사용하지 않는 아이콘/컴포넌트 자동 제거
    optimizePackageImports: ['@heroicons/react', 'framer-motion'],
  },

  // ⚡ 프로덕션 Source Map 비활성화: 번들 크기 감소 + 보안 강화
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig