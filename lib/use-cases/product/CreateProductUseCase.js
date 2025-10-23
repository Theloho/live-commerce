/**
 * CreateProductUseCase - 상품 생성 Use Case (Clean Architecture)
 * @author Claude
 * @since 2025-10-23
 * @version 1.0
 */

import { BaseUseCase } from '../BaseUseCase'

/**
 * CreateProductUseCase - 상품 생성 비즈니스 로직
 *
 * Application Layer:
 * - 상품 생성 + Variant 시스템 전체 워크플로우
 * - ProductRepository를 통한 DB 저장
 * - SKU 자동 생성 로직
 * - 재고 계산 로직
 *
 * Dependency Injection:
 * - ProductRepository: Infrastructure Layer
 */
export class CreateProductUseCase extends BaseUseCase {
  /**
   * @param {ProductRepository} productRepository - Dependency Injection
   */
  constructor(productRepository) {
    super()
    this.productRepository = productRepository
  }

  /**
   * 상품 생성 실행
   *
   * @param {Object} params - 상품 생성 파라미터
   * @param {string} params.title - 상품명
   * @param {string} params.product_number - 제품번호
   * @param {number} params.price - 가격
   * @param {number} params.inventory - 재고 (옵션 없는 경우)
   * @param {string} params.thumbnail_url - 썸네일 이미지
   * @param {string} params.description - 간단 설명
   * @param {string} params.optionType - 옵션 타입 ('none', 'size', 'color', 'both')
   * @param {Array<string>} params.sizeOptions - 사이즈 옵션 배열
   * @param {Array<string>} params.colorOptions - 색상 옵션 배열
   * @param {Object} params.optionInventories - 옵션별 재고 (key: 조합키, value: 수량)
   * @param {Array<Object>} params.combinations - 옵션 조합 배열
   * @param {string} params.supplier_id - 공급업체 ID (선택)
   * @param {string} params.supplier_product_code - 공급업체 상품코드 (선택)
   * @param {string} params.category - 카테고리 (선택)
   * @param {string} params.sub_category - 서브카테고리 (선택)
   * @param {number} params.purchase_price - 매입가 (선택)
   * @param {string} params.purchase_date - 매입일 (선택)
   * @param {number} params.compare_price - 비교가격 (선택)
   * @param {string} params.detailed_description - 상세 설명 (선택)
   * @param {string} params.status - 상태 (기본값: 'active')
   * @param {boolean} params.is_live - 라이브 상품 여부 (기본값: true)
   *
   * @returns {Promise<Object>} 생성된 상품 정보
   * @throws {Error} 생성 실패 시
   */
  async execute({
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
  }) {
    try {
      const registrationType = is_live !== false ? '빠른등록' : '상세등록'
      this.log(`[${registrationType}] 상품 생성 시작`, { product_number })

      // 1. 총 재고 계산
      const totalInventory = this._calculateTotalInventory(
        inventory,
        optionType,
        optionInventories
      )

      // 2. 상품 데이터 준비
      const productData = this._prepareProductData({
        title,
        product_number,
        price,
        inventory: totalInventory,
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

      // 3. 상품 생성 (Repository)
      const product = await this.productRepository.create(productData)
      this.log(`[${registrationType}] 상품 생성 완료`, { product_id: product.id })

      // 4. 옵션이 있는 경우 Variant 시스템 생성
      if (optionType !== 'none' && combinations && combinations.length > 0) {
        this.log(`[${registrationType}] Variant 시스템 생성 시작`, {
          optionType,
          combinationsCount: combinations.length,
        })

        await this._createVariantSystem({
          product,
          optionType,
          sizeOptions,
          colorOptions,
          combinations,
          optionInventories,
          registrationType,
        })

        this.log(`[${registrationType}] Variant 시스템 생성 완료`)
      } else {
        this.log(`[${registrationType}] 옵션 없는 단일 상품`)
      }

      this.log(`[${registrationType}] 상품 저장 완료`, { product_id: product.id })
      return { product }
    } catch (error) {
      this.handleError(error, '상품 생성 실패')
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
      title: title.trim() || product_number,
      product_number: product_number,
      price: parseInt(price),
      inventory: inventory,
      thumbnail_url: thumbnail_url,
      description: description || '',
      status: status || 'active',
      is_featured: false,
      tags: ['NEW'],

      // 라이브 설정 (빠른등록: true, 상세등록: false)
      is_live: is_live !== undefined ? is_live : true,
      is_live_active: is_live !== undefined ? is_live : true,
      live_start_time: is_live !== false ? new Date().toISOString() : null,
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
    registrationType,
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
