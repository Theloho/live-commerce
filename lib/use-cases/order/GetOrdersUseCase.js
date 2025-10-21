/**
 * GetOrdersUseCase - 주문 목록 조회 Use Case
 * @author Claude
 * @since 2025-10-21
 */

import { BaseUseCase } from '../BaseUseCase'
import { Order } from '@/lib/domain/order/Order'

/**
 * GetOrdersUseCase - 주문 목록 조회 비즈니스 로직
 * - 캐시 확인 (CacheService)
 * - Repository 조회 (캐시 미스 시)
 * - 캐시 저장 (1시간 TTL)
 */
export class GetOrdersUseCase extends BaseUseCase {
  /**
   * @param {OrderRepository} orderRepository
   * @param {CacheService} cacheService
   */
  constructor(orderRepository, cacheService) {
    super()
    this.orderRepository = orderRepository
    this.cacheService = cacheService
  }

  /**
   * 주문 목록 조회 실행
   * @param {Object} params - { user, filters? }
   * @param {Object} params.user - 사용자 정보 { id, orderType? }
   * @param {Object} params.filters - 필터 조건 (선택)
   * @returns {Promise<Order[]>} Order Entity 배열
   */
  async execute({ user, filters = {} }) {
    try {
      // 1. 캐시 키 생성
      const cacheKey = this._generateCacheKey(user, filters)

      // 2. 캐시 확인
      const cached = await this.cacheService.get(cacheKey)
      if (cached) {
        this.log('캐시 히트', { cacheKey, count: cached.length })
        return cached.map((data) => Order.fromJSON(data))
      }

      // 3. Repository 조회 (캐시 미스)
      this.log('캐시 미스, DB 조회', { cacheKey })
      const orders = await this.orderRepository.findByUser(user.id, user.orderType)

      // 4. 캐시 저장 (1시간 TTL)
      const jsonData = orders.map((order) => order)
      await this.cacheService.set(cacheKey, jsonData, 3600)

      // 5. Order Entity 변환
      return orders.map((data) => Order.fromJSON(data))
    } catch (error) {
      this.handleError(error, '주문 목록 조회 실패')
    }
  }

  /**
   * 캐시 무효화
   * @param {Object} user - 사용자 정보
   */
  async invalidateCache(user) {
    const cacheKey = this._generateCacheKey(user, {})
    await this.cacheService.invalidate(cacheKey)
    this.log('캐시 무효화', { cacheKey })
  }

  /**
   * 캐시 키 생성 @private
   * @param {Object} user - 사용자 정보
   * @param {Object} filters - 필터 조건
   * @returns {string} 캐시 키
   */
  _generateCacheKey(user, filters) {
    const userId = user.id || 'anonymous'
    const orderType = user.orderType || ''
    const filterStr = Object.keys(filters).length > 0 ? JSON.stringify(filters) : 'all'
    return `orders:${userId}:${orderType}:${filterStr}`
  }
}
