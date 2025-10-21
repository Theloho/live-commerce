/**
 * Jest Configuration (Phase 7 - Unit Testing)
 * - Repository Layer 테스트
 * - Use Case Layer 테스트
 * - Node 환경 (서버 사이드 코드)
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Next.js app 디렉토리 경로
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  // 테스트 환경: Node (Repository/Use Case는 서버 사이드)
  testEnvironment: 'node',

  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Playwright E2E 테스트 제외
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/' // Playwright 테스트 폴더
  ],

  // 모듈 경로 alias (@/ 지원)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // 커버리지 수집
  collectCoverageFrom: [
    'lib/repositories/**/*.js',
    'lib/use-cases/**/*.js',
    '!**/*.test.js',
    '!**/__tests__/**'
  ],

  // 커버리지 임계값 (80% 목표)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 테스트 타임아웃 (DB 접근 고려)
  testTimeout: 10000,

  // Setup 파일
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 환경변수 로드
  setupFiles: ['<rootDir>/jest.env.js']
}

module.exports = createJestConfig(config)
