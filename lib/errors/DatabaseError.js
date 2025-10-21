/**
 * DatabaseError
 *
 * DB 접근 시 발생하는 에러
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

import { BaseError } from './BaseError'

export class DatabaseError extends BaseError {
  /**
   * @param {string} message - 에러 메시지
   * @param {Object} context - DB 컨텍스트 (table, operation, code 등)
   */
  constructor(message, context = {}) {
    super(message, context)
  }

  getUserMessage() {
    // 사용자에게는 구체적인 DB 에러를 숨김
    return '데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
}
