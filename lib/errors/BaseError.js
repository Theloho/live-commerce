/**
 * BaseError
 *
 * 모든 커스텀 에러의 기본 클래스
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

export class BaseError extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {Object} context - 추가 컨텍스트 정보
   */
  constructor(message, context = {}) {
    super(message)
    this.name = this.constructor.name
    this.context = context
    this.timestamp = new Date().toISOString()

    // 스택 트레이스 캡처
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * 에러 정보를 JSON으로 변환
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    }
  }

  /**
   * 사용자에게 표시할 메시지
   * @returns {string}
   */
  getUserMessage() {
    return this.message
  }
}
