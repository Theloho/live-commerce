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
   * 상품 조회 (IDs - 복수)
   * @param {string[]} productIds - 상품 ID 배열
   * @returns {Promise<Array>} 상품 배열
   */
  async findByIds(productIds) {
    try {
      const supabase = this._getClient()

      if (!productIds || productIds.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('products')
        .select(`*`)
        .in('id', productIds)

      if (error) throw error

      logger.debug('✅ [ProductRepository] 복수 상품 조회:', data?.length, '개')
      return data || []
    } catch (error) {
      logger.error('❌ [ProductRepository] 복수 상품 조회 실패:', error)
      throw new Error(`복수 상품 조회 실패: ${error.message}`)
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
   * 재고 확인 (옵션 없는 상품)
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
   * Variant 조회 (옵션 포함)
   */
  async findVariantsByProduct(productId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          variant_option_values (
            option_value_id,
            product_option_values (
              id,
              value,
              option_id,
              product_options (
                id,
                name
              )
            )
          )
        `)
        .eq('product_id', productId)
        .order('sku', { ascending: true })

      if (error) throw error

      // 데이터 구조 정리
      const variants = data.map(variant => ({
        ...variant,
        options: variant.variant_option_values.map(vov => ({
          optionName: vov.product_option_values.product_options.name,
          optionValue: vov.product_option_values.value,
          optionId: vov.product_option_values.product_options.id,
          valueId: vov.product_option_values.id
        }))
      }))

      logger.info('✅ [ProductRepository] Variant 조회:', variants.length, '개')
      return variants
    } catch (error) {
      logger.error('❌ [ProductRepository] Variant 조회 실패:', error)
      throw new Error(`Variant 조회 실패: ${error.message}`)
    }
  }

  /**
   * 옵션별 재고 확인
   */
  async checkInventoryWithOptions(productId, selectedOptions) {
    try {
      const supabase = this._getClient()

      logger.debug('🔍 [ProductRepository] 옵션별 재고 확인:', { productId, selectedOptions })

      // 1. 상품의 모든 옵션 조회
      const { data: productOptions, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId)

      if (optionsError) throw optionsError

      // 옵션이 없는 상품은 products.inventory 사용
      if (!productOptions || productOptions.length === 0) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('inventory')
          .eq('id', productId)
          .single()

        if (productError) throw productError

        return {
          available: product.inventory > 0,
          inventory: product.inventory || 0
        }
      }

      // 2. 선택된 옵션값들의 ID를 찾기
      const optionValueIds = []
      for (const option of productOptions) {
        const selectedValue = selectedOptions[option.name]
        logger.debug(`옵션 "${option.name}" 확인:`, { selectedValue, optionId: option.id })

        if (!selectedValue) {
          logger.debug(`옵션 "${option.name}"에 선택값 없음, 스킵`)
          continue
        }

        // product_option_values에서 해당 값 찾기
        const { data: optionValues, error: valuesError } = await supabase
          .from('product_option_values')
          .select('id, value')
          .eq('option_id', option.id)

        if (valuesError) throw valuesError

        logger.debug(`옵션 "${option.name}"의 가능한 값들:`, optionValues)

        const matchedValue = optionValues?.find(v => v.value === selectedValue)

        if (!matchedValue) {
          logger.warn(`옵션 "${option.name}"에서 값 "${selectedValue}"을 찾을 수 없음`)
          logger.warn('가능한 값들:', optionValues?.map(v => v.value))
          return { available: false, inventory: 0 }
        }

        logger.debug(`✅ 매칭된 값:`, matchedValue)
        optionValueIds.push(matchedValue.id)
      }

      // 3. 해당 옵션값 조합을 가진 variant 찾기
      logger.debug('수집된 option_value_ids:', optionValueIds)

      const { data: variantMappings, error: mappingsError } = await supabase
        .from('variant_option_values')
        .select('variant_id')
        .in('option_value_id', optionValueIds)

      if (mappingsError) throw mappingsError

      logger.debug('Variant 매핑 결과:', variantMappings)

      // variant_id별로 매칭된 option_value_id 개수 세기
      const variantCounts = {}
      variantMappings?.forEach(m => {
        variantCounts[m.variant_id] = (variantCounts[m.variant_id] || 0) + 1
      })

      logger.debug('Variant별 매칭 카운트:', variantCounts)
      logger.debug('필요한 매칭 개수:', optionValueIds.length)

      // 모든 옵션값이 매칭된 variant 찾기
      const matchedVariantId = Object.entries(variantCounts).find(
        ([_, count]) => count === optionValueIds.length
      )?.[0]

      if (!matchedVariantId) {
        logger.warn('선택된 옵션 조합에 해당하는 variant를 찾을 수 없음')
        return { available: false, inventory: 0 }
      }

      logger.debug('✅ 매칭된 variant_id:', matchedVariantId)

      // 4. variant의 재고 확인
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('inventory')
        .eq('id', matchedVariantId)
        .single()

      if (variantError) throw variantError

      logger.info('✅ [ProductRepository] 옵션별 재고 확인 완료:', {
        productId,
        variantId: matchedVariantId,
        inventory: variant.inventory
      })

      return {
        available: variant.inventory > 0,
        inventory: variant.inventory || 0,
        variantId: matchedVariantId
      }
    } catch (error) {
      logger.error('❌ [ProductRepository] 옵션별 재고 확인 실패:', error)
      throw new Error(`옵션별 재고 확인 실패: ${error.message}`)
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

  /**
   * 상품 옵션 생성 (product_options)
   */
  async createProductOption(productId, name, displayOrder = 0) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('product_options')
        .insert({
          product_id: productId,
          name: name,
          display_order: displayOrder,
          is_required: false
        })
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [ProductRepository] 옵션 생성:', name)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 옵션 생성 실패:', error)
      throw new Error(`옵션 생성 실패: ${error.message}`)
    }
  }

  /**
   * 옵션값 생성 (product_option_values)
   */
  async createOptionValue(optionId, value, displayOrder = 0) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('product_option_values')
        .insert({
          option_id: optionId,
          value: value,
          display_order: displayOrder
        })
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [ProductRepository] 옵션값 생성:', value)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 옵션값 생성 실패:', error)
      throw new Error(`옵션값 생성 실패: ${error.message}`)
    }
  }

  /**
   * 옵션값 일괄 생성 (product_option_values batch)
   */
  async createOptionValues(optionId, values) {
    try {
      const supabase = this._getClient()

      const valuesToInsert = values.map((value, index) => ({
        option_id: optionId,
        value: value,
        display_order: index
      }))

      const { data, error } = await supabase
        .from('product_option_values')
        .insert(valuesToInsert)
        .select()

      if (error) throw error

      logger.info('✅ [ProductRepository] 옵션값 일괄 생성:', values.length + '개')
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] 옵션값 일괄 생성 실패:', error)
      throw new Error(`옵션값 일괄 생성 실패: ${error.message}`)
    }
  }

  /**
   * Variant 생성 (product_variants)
   */
  async createVariant(productId, sku, inventory, priceAdjustment = 0) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          sku: sku,
          inventory: inventory,
          price_adjustment: priceAdjustment,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      logger.info('✅ [ProductRepository] Variant 생성:', sku)
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] Variant 생성 실패:', error)
      throw new Error(`Variant 생성 실패: ${error.message}`)
    }
  }

  /**
   * Variant 옵션값 매핑 (variant_option_values)
   */
  async createVariantMapping(variantId, optionValueId) {
    try {
      const supabase = this._getClient()

      const { data, error } = await supabase
        .from('variant_option_values')
        .insert({
          variant_id: variantId,
          option_value_id: optionValueId
        })
        .select()
        .single()

      if (error) throw error

      logger.debug('✅ [ProductRepository] Variant 매핑 생성')
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] Variant 매핑 실패:', error)
      throw new Error(`Variant 매핑 실패: ${error.message}`)
    }
  }

  /**
   * Variant 옵션값 매핑 일괄 생성
   */
  async createVariantMappings(mappings) {
    try {
      const supabase = this._getClient()

      const { data, error} = await supabase
        .from('variant_option_values')
        .insert(mappings)
        .select()

      if (error) throw error

      logger.debug('✅ [ProductRepository] Variant 매핑 일괄 생성:', mappings.length + '개')
      return data
    } catch (error) {
      logger.error('❌ [ProductRepository] Variant 매핑 일괄 생성 실패:', error)
      throw new Error(`Variant 매핑 일괄 생성 실패: ${error.message}`)
    }
  }
}

export default new ProductRepository()
