/**
 * 환경별 로그 관리 유틸리티
 *
 * 개발 환경: 모든 로그 출력
 * 프로덕션: 에러/경고만 출력
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true'

export const logger = {
  /**
   * 디버깅용 로그 (개발 환경에서만)
   * 예: 변수 값 추적, 플로우 확인
   */
  debug: (...args) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(...args)
    }
  },

  /**
   * 정보성 로그 (개발 환경에서만)
   * 예: 성공 메시지, 중요 이벤트
   */
  info: (...args) => {
    if (isDevelopment || isDebugEnabled) {
      console.log(...args)
    }
  },

  /**
   * 에러 로그 (항상 출력)
   * 프로덕션에서 에러 추적 필수
   */
  error: (...args) => {
    console.error(...args)
  },

  /**
   * 경고 로그 (항상 출력)
   * 잠재적 문제 추적
   */
  warn: (...args) => {
    console.warn(...args)
  },

  /**
   * 성능 측정 시작
   * 개발 환경에서만 측정
   */
  timeStart: (label) => {
    if (isDevelopment || isDebugEnabled) {
      console.time(label)
    }
  },

  /**
   * 성능 측정 종료
   * 개발 환경에서만 출력
   */
  timeEnd: (label) => {
    if (isDevelopment || isDebugEnabled) {
      console.timeEnd(label)
    }
  },

  /**
   * 그룹 시작 (중첩 로그용)
   */
  group: (label) => {
    if (isDevelopment || isDebugEnabled) {
      console.group(label)
    }
  },

  /**
   * 그룹 종료
   */
  groupEnd: () => {
    if (isDevelopment || isDebugEnabled) {
      console.groupEnd()
    }
  }
}

/**
 * 프로덕션 환경 체크
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production' && !isDebugEnabled
}

/**
 * 조건부 로그 (함수형)
 * 복잡한 로그 생성 시 사용 (성능 최적화)
 */
export const conditionalLog = (logFn) => {
  if (isDevelopment || isDebugEnabled) {
    logFn()
  }
}

export default logger
