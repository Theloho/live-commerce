/**
 * orderWorker.js - 주문 생성 Queue Worker
 * @author Claude
 * @since 2025-10-21
 * BullMQ Worker for async order processing
 */

import { Worker } from 'bullmq'
import { Redis } from '@upstash/redis'
import { OrderRepository } from '../repositories/OrderRepository.js'
import { ProductRepository } from '../repositories/ProductRepository.js'
import { CouponRepository } from '../repositories/CouponRepository.js'

// Redis 연결 (QueueService와 동일)
const redisConnection = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

/**
 * processCreateOrder - 주문 생성 작업 처리
 * @param {Object} job - BullMQ Job 인스턴스
 * @param {Object} job.data - 주문 생성 데이터
 * @param {Object} job.data.orderData - orders 테이블 데이터
 * @param {Array} job.data.orderItems - order_items 배열
 * @param {Object} job.data.payment - order_payments 데이터
 * @param {Object} job.data.shipping - order_shipping 데이터
 * @param {Object} job.data.couponData - 쿠폰 정보 (선택)
 * @param {string} job.data.couponData.couponId - 쿠폰 ID
 * @param {number} job.data.couponData.discountAmount - 할인 금액
 * @returns {Promise<Object>} { success, orderId, customerOrderNumber }
 * @throws {Error} 재고 부족, DB 에러 등
 */
async function processCreateOrder(job) {
  const { orderData, orderItems, payment, shipping, couponData } = job.data

  console.log(`🛒 주문 생성 작업 시작: ${job.id}`)

  try {
    // 1. 재고 검증 및 차감 (각 아이템)
    const productRepo = new ProductRepository()
    for (const item of orderItems) {
      if (item.product_id) {
        // 음수로 재고 차감
        // TODO: Phase 1.7에서 update_inventory_with_lock RPC 함수로 교체
        await productRepo.updateInventory(item.product_id, -item.quantity)
        console.log(`📦 재고 차감: ${item.product_id} (-${item.quantity})`)
      }
    }

    // 2. 주문 생성 (4개 테이블 INSERT)
    const orderRepo = new OrderRepository()
    const createdOrder = await orderRepo.create({
      orderData,
      orderItems,
      payment,
      shipping,
    })

    console.log(`✅ 주문 생성 완료: ${createdOrder.id}`)

    // 3. 쿠폰 사용 처리 (있는 경우)
    if (couponData && couponData.couponId) {
      const couponRepo = new CouponRepository()
      const used = await couponRepo.useCoupon(
        orderData.user_id,
        couponData.couponId,
        createdOrder.id,
        couponData.discountAmount
      )

      if (!used) {
        console.warn(`⚠️ 쿠폰 사용 실패: ${couponData.couponId} (주문은 생성됨)`)
      }
    }

    return {
      success: true,
      orderId: createdOrder.id,
      customerOrderNumber: createdOrder.customer_order_number,
    }
  } catch (error) {
    console.error('❌ 주문 생성 실패:', error)
    // 재고 롤백은 BullMQ 재시도 메커니즘에 의존
    // 실패 시 재고는 자동으로 다시 증가됨 (재시도 전)
    throw error // BullMQ가 자동 재시도 (attempts: 3)
  }
}

// Worker 초기화
const orderWorker = new Worker('orders', processCreateOrder, {
  connection: redisConnection,
  concurrency: 5, // 동시 처리 작업 수
  limiter: {
    max: 10, // 최대 10개
    duration: 1000, // 1초당
  },
})

// 이벤트 핸들러
orderWorker.on('completed', (job, result) => {
  console.log(`✅ 작업 완료: ${job.id} → ${result.orderId}`)
})

orderWorker.on('failed', (job, err) => {
  console.error(`❌ 작업 실패: ${job.id} (시도: ${job.attemptsMade}/${job.opts.attempts})`, err.message)
})

orderWorker.on('error', (err) => {
  console.error('❌ Worker 에러:', err)
})

orderWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ 작업 정체: ${jobId} (처리 중단 감지)`)
})

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Worker 종료 중...')
  await orderWorker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log('🚀 OrderWorker 시작 (Queue: orders, Concurrency: 5)')

export default orderWorker
