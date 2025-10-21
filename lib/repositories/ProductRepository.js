/**
 * ProductRepository - 상품 데이터 접근 레이어
 * @author Claude
 * @since 2025-10-21
 */

import { BaseRepository } from './BaseRepository'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DatabaseError } from '@/lib/errors'

export class ProductRepository extends BaseRepository {
  constructor() {
    super(supabaseAdmin, 'products')
  }

  /**
   * 활성 상품 목록 조회 (홈페이지용)
   * @param {Object} filters - 필터 옵션
   * @param {number} filters.limit - 조회 개수 제한 (기본: 50)
   * @param {boolean} filters.featuredOnly - 추천 상품만 조회
   * @returns {Promise<Array>}
   * @throws {DatabaseError}
   */
  async findAll(filters = {}) {
    const { limit = 50, featuredOnly = false } = filters

    try {
      let query = this.client
        .from(this.tableName)
        .select('id, title, product_number, price, compare_price, thumbnail_url, inventory, status, is_featured, is_live_active, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (featuredOnly) {
        query = query.eq('is_featured', true)
      }

      const { data, error } = await query

      if (error) {
        throw new DatabaseError('상품 목록 조회 실패', {
          table: this.tableName,
          details: error
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('상품 목록 조회 중 오류', {
        table: this.tableName,
        details: error
      })
    }
  }

  /**
   * 상품 상세 조회 (Variant 포함)
   * @param {string} productId - 상품 ID
   * @returns {Promise<Object|null>}
   * @throws {DatabaseError}
   */
  async findById(productId) {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(`
          *,
          product_variants (
            *,
            variant_option_values (
              *,
              product_option_values (
                *,
                product_options (*)
              )
            )
          )
        `)
        .eq('id', productId)
        .single()

      if (error) {
        // 404 에러는 null 반환
        if (error.code === 'PGRST116') {
          return null
        }

        throw new DatabaseError('상품 조회 실패', {
          table: this.tableName,
          productId,
          details: error
        })
      }

      return data
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('상품 조회 중 오류', {
        table: this.tableName,
        productId,
        details: error
      })
    }
  }

  /**
   * 여러 상품 배치 조회
   * @param {Array<string>} productIds - 상품 ID 배열
   * @returns {Promise<Array>}
   * @throws {DatabaseError}
   */
  async findByIds(productIds) {
    if (!productIds || productIds.length === 0) {
      return []
    }

    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .in('id', productIds)

      if (error) {
        throw new DatabaseError('상품 배치 조회 실패', {
          table: this.tableName,
          productIds,
          details: error
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('상품 배치 조회 중 오류', {
        table: this.tableName,
        productIds,
        details: error
      })
    }
  }

  /**
   * 상품 재고 증감
   * @param {string} productId - 상품 ID
   * @param {number} change - 증감량 (양수: 증가, 음수: 감소)
   * @returns {Promise<Object>} 업데이트된 상품 정보
   * @throws {DatabaseError}
   *
   * ⚠️ 주의: Race Condition 위험 있음
   * Phase 1.7에서 FOR UPDATE NOWAIT RPC 함수로 교체 예정
   */
  async updateInventory(productId, change) {
    try {
      // 현재 재고 조회
      const { data: product, error: fetchError } = await this.client
        .from(this.tableName)
        .select('inventory')
        .eq('id', productId)
        .single()

      if (fetchError) {
        throw new DatabaseError('상품 재고 조회 실패', {
          table: this.tableName,
          productId,
          details: fetchError
        })
      }

      const newInventory = product.inventory + change

      // 재고 업데이트
      const { data: updated, error: updateError } = await this.client
        .from(this.tableName)
        .update({ inventory: newInventory })
        .eq('id', productId)
        .select()
        .single()

      if (updateError) {
        throw new DatabaseError('상품 재고 업데이트 실패', {
          table: this.tableName,
          productId,
          change,
          details: updateError
        })
      }

      console.log(`📦 상품 재고 변경: ${productId} (${product.inventory} → ${newInventory})`)
      return updated
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      throw new DatabaseError('상품 재고 업데이트 중 오류', {
        table: this.tableName,
        productId,
        change,
        details: error
      })
    }
  }
}
