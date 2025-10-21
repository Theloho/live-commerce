/**
 * CacheService - 캐시 관리 레이어
 * @author Claude
 * @since 2025-10-21
 * Upstash Redis 기반 캐시 시스템
 */

import { Redis } from '@upstash/redis'

// Redis 클라이언트 초기화 (Upstash Redis REST API)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export class CacheService {
  /**
   * 캐시에서 값 조회
   * @param {string} key - 캐시 키
   * @returns {Promise<any|null>} 캐시된 값 또는 null
   * @throws {Error}
   */
  static async get(key) {
    try {
      const value = await redis.get(key)
      if (value) {
        console.log(`✅ 캐시 조회 성공: ${key}`)
      } else {
        console.log(`⚠️ 캐시 미스: ${key}`)
      }
      return value
    } catch (error) {
      console.error('❌ 캐시 조회 실패:', error)
      throw new Error(`캐시 조회 실패: ${error.message}`)
    }
  }

  /**
   * 캐시에 값 저장
   * @param {string} key - 캐시 키
   * @param {any} value - 저장할 값 (JSON 직렬화 가능)
   * @param {number} ttl - TTL (초 단위, 기본값: 3600초 = 1시간)
   * @returns {Promise<void>}
   * @throws {Error}
   */
  static async set(key, value, ttl = 3600) {
    try {
      await redis.set(key, value, { ex: ttl })
      console.log(`✅ 캐시 저장 성공: ${key} (TTL: ${ttl}초)`)
    } catch (error) {
      console.error('❌ 캐시 저장 실패:', error)
      throw new Error(`캐시 저장 실패: ${error.message}`)
    }
  }

  /**
   * 캐시 무효화 (삭제)
   * @param {string} key - 캐시 키
   * @returns {Promise<number>} 삭제된 키 개수
   * @throws {Error}
   */
  static async invalidate(key) {
    try {
      const result = await redis.del(key)
      console.log(`✅ 캐시 무효화 완료: ${key}`)
      return result
    } catch (error) {
      console.error('❌ 캐시 무효화 실패:', error)
      throw new Error(`캐시 무효화 실패: ${error.message}`)
    }
  }
}
