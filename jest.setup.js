/**
 * Jest Setup (Phase 7)
 * - 글로벌 설정
 * - 모든 테스트 전에 실행
 */

// 타임아웃 글로벌 설정
jest.setTimeout(10000)

// console.log 필터링 (테스트 중 너무 많은 로그 방지)
global.console = {
  ...console,
  log: jest.fn(), // console.log 무시
  debug: jest.fn(), // console.debug 무시
  info: jest.fn(), // console.info 무시
  // warn, error는 유지
  warn: console.warn,
  error: console.error,
}
