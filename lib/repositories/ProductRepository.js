/**
 * ProductRepository - 상품 데이터 저장소 (Phase 5.1)
 * @author Claude
 * @since 2025-10-21
 */

import { createClient } from '@supabase/supabase-js'
import logger from '@/lib/logger'

const getSupabaseAdmin = () => {
  if (typeof window !== 'undefined') {
    throw new Error('ProductRepository는 서버 사이드에서만 사용 가능합니다')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

class ProductRepository {
  constructor() {
    this.supabase = null
  }

  _getClient() {
    if (!this.supabase) {
      this.supabase = getSupabaseAdmin()
    }
    return this.supabase
  }

  /**
   * 상품 조회 (ID)
   */
  async findById(productId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('products')
        .select(`*`)
        .eq('id', productId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 상품 조회 실패:', error)
      throw new Error(`상품 조회 실패: ${error.message}`)
    }
  }

  /**
   * 상품 목록 조회
   */
  async findAll(filters = {}) {
    try {
      const supabase = this._getClient()
      const { status, isLive, page = 1, pageSize = 50 } = filters

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })

      if (status) query = query.eq('status', status)
      if (isLive !== undefined) query = query.eq('is_live_active', isLive)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        products: data,
        totalCount: count,
        currentPage: page,
        totalPages: Math.ceil(count / pageSize)
      }
    } catch (error) {
      logger.error('❌ [ProductRepository] 상품 목록 조회 실패:', error)
      throw new Error(`상품 목록 조회 실패: ${error.message}`)
    }
  }

  /**
   * 상품 생성
   */
  async create(productData) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [ProductRepository] 상품 생성:', data.id)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 상품 생성 실패:', error)
      throw new Error(`상품 생성 실패: ${error.message}`)
    }
  }

  /**
   * 상품 업데이트
   */
  async update(productId, productData) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId)
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [ProductRepository] 상품 업데이트:', productId)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 상품 업데이트 실패:', error)
      throw new Error(`상품 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 재고 업데이트
   */
  async updateInventory(productId, quantityChange) {
    try {
      const supabase = this._getClient()

      // 1. 현재 재고 조회
      const { data: product, error: selectError } = await supabase
        .from('products')
        .select('inventory')
        .eq('id', productId)
        .single()

      if (selectError) throw selectError

      // 2. 새 재고 계산
      const newInventory = product.inventory + quantityChange

      // 3. 재고 부족 검증
      if (newInventory < 0) {
        throw new Error('재고 부족: 현재 재고보다 많은 수량을 차감할 수 없습니다')
      }

      // 4. 재고 업데이트
      const { data: updated, error: updateError } = await supabase
        .from('products')
        .update({ inventory: newInventory })
        .eq('id', productId)
        .select()
        .single()

      if (updateError) throw updateError

      logger.info('✅ [ProductRepository] 재고 업데이트:', productId, quantityChange, '→', newInventory)
      return { success: true, newInventory }
    } catch (error) {
      logger.error('❌ [ProductRepository] 재고 업데이트 실패:', error)
      throw new Error(`재고 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * Variant 재고 업데이트 (RPC)
   */
  async updateVariantInventory(variantId, quantityChange) {
    try {
      const supabase = this._getClient()

      // ✅ RPC 함수명 수정: update_variant_inventory → update_variant_inventory_with_lock
      const { data, error } = await supabase.rpc('update_variant_inventory_with_lock', {
        p_variant_id: variantId,
        p_change: quantityChange  // ✅ 파라미터명 수정: p_quantity_change → p_change
      })

      if (error) throw error

      logger.info('✅ [ProductRepository] Variant 재고 업데이트:', variantId, quantityChange)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] Variant 재고 업데이트 실패:', error)
      throw new Error(`Variant 재고 업데이트 실패: ${error.message}`)
    }
  }

  /**
   * 재고 확인
   */
  async checkInventory(productId) {
    try {
      const product = await this.findById(productId)

      logger.debug('✅ [ProductRepository] 재고 확인:', productId, '→', product.inventory)
      return product.inventory
    } catch (error) {
      logger.error('❌ [ProductRepository] 재고 확인 실패:', error)
      throw new Error(`재고 확인 실패: ${error.message}`)
    }
  }

  /**
   * 상품 삭제
   */
  async delete(productId) {
    try {
      const supabase = this._getClient()

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      logger.info('✅ [ProductRepository] 상품 삭제:', productId)
      return { success: true }
    } catch (error) {
      logger.error('❌ [ProductRepository] 상품 삭제 실패:', error)
      throw new Error(`상품 삭제 실패: ${error.message}`)
    }
  }
}

export default new ProductRepository()
