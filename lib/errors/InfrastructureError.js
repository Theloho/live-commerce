/**
 * InfrastructureError
 *
 * 인프라 레이어에서 발생하는 에러들
 * - 외부 API 호출 실패
 * - Queue/Cache 에러
 * - 파일 시스템 에러
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

import { BaseError } from './BaseError'

/**
 * 외부 API 호출 실패 에러
 */
export class ExternalApiError extends BaseError {
  constructor(apiName, statusCode, responseBody) {
    super(`외부 API 호출 실패: ${apiName}`, {
      apiName,
      statusCode,
      responseBody
    })
  }

  getUserMessage() {
    return '외부 서비스와 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
}

/**
 * Queue 처리 에러
 */
export class QueueError extends BaseError {
  constructor(queueName, jobId, reason) {
    super(`Queue 처리 실패: ${queueName}`, {
      queueName,
      jobId,
      reason
    })
  }

  getUserMessage() {
    return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
}

/**
 * Cache 에러
 */
export class CacheError extends BaseError {
  constructor(operation, key, reason) {
    super(`Cache ${operation} 실패`, {
      operation,
      key,
      reason
    })
  }

  getUserMessage() {
    return '일시적인 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.'
  }
}

/**
 * 파일 시스템 에러
 */
export class FileSystemError extends BaseError {
  constructor(operation, filePath, reason) {
    super(`파일 시스템 ${operation} 실패`, {
      operation,
      filePath,
      reason
    })
  }

  getUserMessage() {
    return '파일 처리 중 오류가 발생했습니다.'
  }
}

/**
 * 네트워크 타임아웃 에러
 */
export class NetworkTimeoutError extends BaseError {
  constructor(url, timeout) {
    super(`네트워크 타임아웃: ${url}`, {
      url,
      timeout
    })
  }

  getUserMessage() {
    return '네트워크 응답 시간이 초과되었습니다. 인터넷 연결을 확인해주세요.'
  }
}
