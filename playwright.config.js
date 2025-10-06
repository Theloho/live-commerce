import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// 환경변수 로드 (.env.test 파일)
dotenv.config({ path: '.env.test' });

/**
 * Playwright 설정 파일
 * allok.shop 본서버 테스트 환경
 */
export default defineConfig({
  testDir: './tests',

  /* 최대 병렬 실행 워커 수 */
  workers: process.env.CI ? 1 : undefined,

  /* 테스트 실패 시 재시도 횟수 */
  retries: process.env.CI ? 2 : 0,

  /* 타임아웃 설정 */
  timeout: 30 * 1000, // 30초
  expect: {
    timeout: 5000, // assertion 타임아웃 5초
  },

  /* 테스트 실행 시 브라우저 설정 */
  use: {
    /* 본서버 URL */
    baseURL: 'https://allok.shop',

    /* 스크린샷 설정 */
    screenshot: 'only-on-failure',

    /* 비디오 녹화 */
    video: 'retain-on-failure',

    /* 트레이스 설정 (디버깅용) */
    trace: 'on-first-retry',

    /* 네트워크 요청 타임아웃 */
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  /* 테스트 리포터 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  /* 프로젝트별 브라우저 설정 */
  projects: [
    /* Setup: 로그인 상태 저장 (한 번만 실행) */
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: undefined, // setup은 새로운 상태로 시작
      },
    },

    /* 실제 테스트 (저장된 로그인 상태 사용) */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './playwright/.auth/user.json',
      },
      // dependencies: ['setup'], // 이미 로그인 상태가 저장되어 있으므로 setup 건너뜀
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    /* 모바일 테스트 */
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: './playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // ⚠️ 주의: 이 설정은 본서버(https://allok.shop)만 테스트합니다.
  // 로컬 개발서버는 사용하지 않습니다.
});
