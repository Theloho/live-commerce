/**
 * UpdateProductUseCase - 상품 수정 Use Case (Clean Architecture)
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * UpdateProductUseCase - 상품 수정 비즈니스 로직
 *
 * Application Layer:
 * - 상품 수정 + Variant 시스템 재구성
 * - ProductRepository를 통한 DB 저장
 * - 기존 옵션/Variant 삭제 후 재생성
 *
 * Dependency Injection:
 * - ProductRepository: Infrastructure Layer
 */
export class UpdateProductUseCase extends BaseUseCase {
  /**
   * @param {ProductRepository} productRepository - Dependency Injection
   */
  constructor(productRepository) {
    super()
    this.productRepository = productRepository
  }

  /**
   * 상품 수정 실행
   *
   * @param {string} productId - 수정할 상품 ID
   * @param {Object} params - 상품 수정 파라미터 (CreateProductUseCase와 동일)
   * @returns {Promise<Object>} 수정된 상품 정보
   * @throws {Error} 수정 실패 시
   */
  async execute(productId, params) {
    try {
      // 파라미터 destructuring
      const {
        // 기본 필드
        title,
        product_number,
        price,
        inventory,
        thumbnail_url,
        description,

        // 옵션 필드
        optionType,
        sizeOptions,
        colorOptions,
        optionInventories,
        combinations,

        // 상세등록 추가 필드
        supplier_id,
        supplier_product_code,
        category,
        sub_category,
        purchase_price,
        purchase_date,
        compare_price,
        detailed_description,
        status,
        is_live,
      } = params

      this.log('상품 수정 시작', { product_id: productId, product_number })

      // 1. 기존 상품 존재 확인
      const existingProduct = await this.productRepository.findById(productId)
      if (!existingProduct) {
        throw new Error(`상품을 찾을 수 없습니다: ${productId}`)
      }

      // 2. 총 재고 계산 (옵션 정보가 전달된 경우에만)
      // ⚠️ 중요: 업체 정보만 수정할 때 optionType이 undefined면 재고 계산 건너뛰기!
      const totalInventory = optionType !== undefined
        ? this._calculateTotalInventory(inventory, optionType, optionInventories)
        : undefined

      // 3. 상품 데이터 준비
      const productData = this._prepareProductData({
        title,
        product_number,
        price,
        inventory: totalInventory, // undefined면 _prepareProductData에서 제외 (기존 값 유지)
        thumbnail_url,
        description,
        status,
        is_live,
        supplier_id,
        supplier_product_code,
        category,
        sub_category,
        purchase_price,
        purchase_date,
        compare_price,
        detailed_description,
      })

      // 4. 상품 기본 정보 수정 (Repository)
      const updatedProduct = await this.productRepository.update(productId, productData)
      this.log('상품 기본 정보 수정 완료', { product_id: productId })

      // 5. Variant 시스템 재구성 (옵션 정보가 전달된 경우에만)
      // ⚠️ 중요: 가격만 수정할 때는 기존 Variant를 유지해야 함!
      if (optionType && combinations && combinations.length > 0) {
        this.log('Variant 시스템 재구성 시작 (옵션 변경)', {
          optionType,
          combinationsCount: combinations.length,
        })

        // 5-1. 기존 Variant 시스템 삭제
        await this._deleteExistingVariantSystem(productId)

        // 5-2. 새 Variant 시스템 생성
        if (optionType !== 'none') {
          await this._createVariantSystem({
            product: updatedProduct,
            optionType,
            sizeOptions,
            colorOptions,
            combinations,
            optionInventories,
          })
          this.log('Variant 시스템 재구성 완료')
        } else {
          this.log('옵션 없는 단일 상품으로 변경')
        }
      } else {
        this.log('옵션 정보 없음 - 기존 Variant 유지 (가격/재고만 수정)')
      }

      this.log('상품 수정 완료', { product_id: productId })
      return { product: updatedProduct }
    } catch (error) {
      this.handleError(error, '상품 수정 실패')
    }
  }

  /**
   * 총 재고 계산
   * @private
   */
  _calculateTotalInventory(inventory, optionType, optionInventories) {
    if (optionType === 'none') {
      return inventory
    }

    // 옵션이 있는 경우: 모든 조합의 재고 합계
    return Object.values(optionInventories || {}).reduce(
      (sum, qty) => sum + (qty || 0),
      0
    )
  }

  /**
   * 상품 데이터 준비
   * @private
   */
  _prepareProductData({
    title,
    product_number,
    price,
    inventory,
    thumbnail_url,
    description,
    status,
    is_live,
    supplier_id,
    supplier_product_code,
    category,
    sub_category,
    purchase_price,
    purchase_date,
    compare_price,
    detailed_description,
  }) {
    const productData = {
      // 기본 필드
      title: title?.trim() || product_number || '',
      product_number: product_number || '',
      price: parseInt(price) || 0,
      thumbnail_url: thumbnail_url || '',
      description: description || '',
      status: status || 'active',

      // updated_at 자동 업데이트
      updated_at: new Date().toISOString(),
    }

    // ✅ inventory가 전달된 경우에만 업데이트 (undefined면 기존 값 유지)
    // ⚠️ 중요: 업체 정보만 수정할 때 inventory를 0으로 덮어쓰지 않음!
    if (inventory !== undefined) {
      productData.inventory = inventory || 0
    }

    // ✅ 라이브 설정 (전달된 경우에만 업데이트, 아니면 기존 값 유지)
    // ⚠️ 중요: 업체 정보만 수정할 때 is_live가 undefined면 기존 상태 유지!
    if (is_live !== undefined) {
      productData.is_live = is_live
      productData.is_live_active = is_live
      productData.live_start_time = is_live ? new Date().toISOString() : null
    }

    // 상세등록 추가 필드 (있는 경우만)
    if (supplier_id) productData.supplier_id = supplier_id
    if (supplier_product_code) productData.supplier_product_code = supplier_product_code
    if (category) productData.category = category
    if (sub_category) productData.sub_category = sub_category
    if (purchase_price) productData.purchase_price = parseFloat(purchase_price)
    if (purchase_date) productData.purchase_date = purchase_date
    if (compare_price) productData.compare_price = parseFloat(compare_price)
    if (detailed_description) productData.detailed_description = detailed_description

    return productData
  }

  /**
   * 기존 Variant 시스템 삭제
   * @private
   */
  async _deleteExistingVariantSystem(productId) {
    this.log('기존 Variant 시스템 삭제 시작', { product_id: productId })

    // 순서 중요! (Foreign Key Constraints 고려)
    // 1. variant_option_values 삭제 (가장 하위)
    // 2. product_variants 삭제
    // 3. product_option_values 삭제
    // 4. product_options 삭제 (가장 상위)

    // Note: Cascade Delete가 설정되어 있다면 product_options만 삭제해도 되지만,
    // 명시적으로 순서대로 삭제하는 것이 안전함

    try {
      // Supabase Admin Client 사용 (RLS 우회)
      const supabase = this.productRepository._getClient()

      // 1. 기존 Variant 조회
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', productId)

      if (variants && variants.length > 0) {
        const variantIds = variants.map((v) => v.id)

        // 1-1. variant_option_values 삭제
        await supabase.from('variant_option_values').delete().in('variant_id', variantIds)

        // 1-2. product_variants 삭제
        await supabase.from('product_variants').delete().eq('product_id', productId)
      }

      // 2. 기존 Option 조회
      const { data: options } = await supabase
        .from('product_options')
        .select('id')
        .eq('product_id', productId)

      if (options && options.length > 0) {
        const optionIds = options.map((o) => o.id)

        // 2-1. product_option_values 삭제
        await supabase.from('product_option_values').delete().in('option_id', optionIds)

        // 2-2. product_options 삭제
        await supabase.from('product_options').delete().eq('product_id', productId)
      }

      this.log('기존 Variant 시스템 삭제 완료', { product_id: productId })
    } catch (error) {
      this.log('기존 Variant 시스템 삭제 실패 (계속 진행)', { error: error.message })
      // 삭제 실패 시에도 계속 진행 (기존 Variant가 없을 수 있음)
    }
  }

  /**
   * Variant 시스템 생성 (옵션 + 조합)
   * @private
   */
  async _createVariantSystem({
    product,
    optionType,
    sizeOptions,
    colorOptions,
    combinations,
    optionInventories,
  }) {
    // 1. product_options 생성
    const optionsToCreate = []

    if (optionType === 'size' || optionType === 'both') {
      optionsToCreate.push({ name: '사이즈', values: sizeOptions })
    }
    if (optionType === 'color' || optionType === 'both') {
      optionsToCreate.push({ name: '색상', values: colorOptions })
    }

    // 2. 옵션별로 생성 + 매핑 저장
    const createdOptionValues = {}

    for (const option of optionsToCreate) {
      // product_options INSERT (Repository)
      const createdOption = await this.productRepository.createProductOption(
        product.id,
        option.name,
        0
      )

      this.log(`  옵션 생성: ${option.name}`)

      // product_option_values INSERT (Batch, Repository)
      const createdValues = await this.productRepository.createOptionValues(
        createdOption.id,
        option.values
      )

      // 매핑 저장 (옵션명 -> 값 -> ID)
      createdOptionValues[option.name] = {}
      createdValues.forEach((val) => {
        createdOptionValues[option.name][val.value] = val.id
      })

      this.log(`  옵션값 ${createdValues.length}개 생성`)
    }

    // 3. product_variants 생성 (조합별로)
    this.log(`Variant 생성 시작 (${combinations.length}개)`)

    // Product ID 앞 8자리 추출 (SKU 유니크 보장)
    const productIdShort = product.id.substring(0, 8)

    for (const combo of combinations) {
      // SKU 생성
      const sku = this._generateSKU(product.product_number, combo, productIdShort)

      // 재고
      const variantInventory = optionInventories[combo.key] || 0

      // product_variants INSERT (Repository)
      const variant = await this.productRepository.createVariant(
        product.id,
        sku,
        variantInventory,
        0
      )

      // 4. variant_option_values 매핑
      const mappings = this._createVariantMappings(combo, variant.id, createdOptionValues)

      // variant_option_values INSERT (Batch, Repository)
      await this.productRepository.createVariantMappings(mappings)

      this.log(`  Variant 생성: ${sku} (재고: ${variantInventory})`)
    }
  }

  /**
   * SKU 생성
   * @private
   */
  _generateSKU(productNumber, combo, productIdShort) {
    let sku = `${productNumber}-${productIdShort}`

    if (combo.type === 'size') {
      sku = `${productNumber}-${combo.size}-${productIdShort}`
    } else if (combo.type === 'color') {
      sku = `${productNumber}-${combo.color}-${productIdShort}`
    } else if (combo.type === 'both') {
      sku = `${productNumber}-${combo.size}-${combo.color}-${productIdShort}`
    }

    return sku
  }

  /**
   * Variant 매핑 생성
   * @private
   */
  _createVariantMappings(combo, variantId, createdOptionValues) {
    const mappings = []

    if (combo.type === 'size') {
      mappings.push({
        variant_id: variantId,
        option_value_id: createdOptionValues['사이즈'][combo.size],
      })
    } else if (combo.type === 'color') {
      mappings.push({
        variant_id: variantId,
        option_value_id: createdOptionValues['색상'][combo.color],
      })
    } else if (combo.type === 'both') {
      mappings.push({
        variant_id: variantId,
        option_value_id: createdOptionValues['사이즈'][combo.size],
      })
      mappings.push({
        variant_id: variantId,
        option_value_id: createdOptionValues['색상'][combo.color],
      })
    }

    return mappings
  }
}
