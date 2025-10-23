/**
 * QueueService - Queue 작업 관리 레이어
 * @author Claude
 * @since 2025-10-21
 * BullMQ + Upstash Redis 기반 Queue 시스템
 */

import { Queue } from 'bullmq'
import { Redis } from '@upstash/redis'

// Redis 클라이언트 초기화 (Upstash Redis REST API)
const redisConnection = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Queue 인스턴스 캐시 (동일한 Queue 재사용)
const queueCache = new Map()

export class QueueService {
  /**
   * Queue 인스턴스 가져오기 (캐시 사용)
   * @private
   * @param {string} queueName - Queue 이름
   * @returns {Queue} BullMQ Queue 인스턴스
   */
  static getQueue(queueName) {
    if (!queueCache.has(queueName)) {
      queueCache.set(queueName, new Queue(queueName, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }))
    }
    return queueCache.get(queueName)
  }

  /**
   * Queue에 작업 추가
   * @param {string} queueName - Queue 이름 (예: 'email', 'notification')
   * @param {Object} data - 작업 데이터
   * @param {Object} options - BullMQ 옵션 (priority, delay 등)
   * @returns {Promise<{jobId: string, position: number}>}
   * @throws {Error}
   */
  static async addJob(queueName, data, options = {}) {
    const startTime = Date.now()
    try {
      console.log(`🔵 [QueueService] addJob 시작:`, queueName)
      const queue = this.getQueue(queueName)
      const job = await queue.add('process', data, options)
      const elapsed = Date.now() - startTime
      console.log(`✅ [QueueService] addJob 완료: ${queueName} (ID: ${job.id}, ${elapsed}ms)`)
      return {
        jobId: job.id,
        // position 제거: getWaiting() 호출이 너무 느림 (수백 개 작업 조회)
      }
    } catch (error) {
      const elapsed = Date.now() - startTime
      console.error(`❌ [QueueService] addJob 실패: ${queueName} (${elapsed}ms)`, error)
      throw new Error(`Queue 작업 추가 실패: ${error.message}`)
    }
  }

  /**
   * Queue 내 작업 위치 조회
   * @param {string} queueName - Queue 이름
   * @param {string} jobId - 작업 ID
   * @returns {Promise<number>} 위치 (0 = 다음 실행, -1 = 완료/실패)
   * @throws {Error}
   */
  static async getQueuePosition(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName)
      const job = await queue.getJob(jobId)
      if (!job) {
        console.log(`⚠️ 작업 없음: ${jobId} (완료 또는 실패)`)
        return -1
      }
      const waitingJobs = await queue.getWaiting()
      const position = waitingJobs.findIndex(j => j.id === jobId)
      return position === -1 ? -1 : position
    } catch (error) {
      console.error('❌ Queue 위치 조회 실패:', error)
      throw new Error(`Queue 위치 조회 실패: ${error.message}`)
    }
  }
}
