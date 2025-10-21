/**
 * Product Entity - 상품 도메인 모델
 * @author Claude
 * @since 2025-10-21
 */

import { Entity } from '../Entity'

export const ProductStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
}

/**
 * Product Entity - 상품 비즈니스 로직 포함
 */
export class Product extends Entity {
  constructor({
    id,
    title,
    product_number,
    price,
    compare_price = null,
    thumbnail_url = null,
    inventory = 0,
    status = ProductStatus.ACTIVE,
    is_featured = false,
    is_live_active = false,
    created_at = new Date(),
    updated_at = new Date(),
  }) {
    super(id)

    this.title = title
    this.product_number = product_number
    this.price = price
    this.compare_price = compare_price
    this.thumbnail_url = thumbnail_url
    this.inventory = inventory
    this.status = status
    this.is_featured = is_featured
    this.is_live_active = is_live_active
    this.created_at = created_at instanceof Date ? created_at : new Date(created_at)
    this.updated_at = updated_at instanceof Date ? updated_at : new Date(updated_at)
  }

  /** 상품 검증 */
  validate() {
    // 필수 필드 검증
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('상품명은 필수입니다.')
    }

    if (!this.product_number) {
      throw new Error('상품 번호는 필수입니다.')
    }

    // 가격 검증
    if (typeof this.price !== 'number' || this.price < 0) {
      throw new Error('가격은 0 이상이어야 합니다.')
    }

    // 재고 검증
    if (typeof this.inventory !== 'number' || this.inventory < 0) {
      throw new Error('재고는 0 이상이어야 합니다.')
    }

    // 상태 검증
    if (!Object.values(ProductStatus).includes(this.status)) {
      throw new Error(`잘못된 상품 상태: ${this.status}`)
    }
  }

  /** 활성 상품 여부 */
  isActive() {
    return this.status === ProductStatus.ACTIVE
  }

  /** 비활성 상품 여부 */
  isInactive() {
    return this.status === ProductStatus.INACTIVE
  }

  /** 삭제된 상품 여부 */
  isDeleted() {
    return this.status === ProductStatus.DELETED
  }

  /** 추천 상품 여부 */
  isFeatured() {
    return this.is_featured === true
  }

  /** 라이브 활성 상품 여부 */
  isLiveActive() {
    return this.is_live_active === true
  }

  /** Plain Object로 변환 (DB 저장/JSON 직렬화) */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      product_number: this.product_number,
      price: this.price,
      compare_price: this.compare_price,
      thumbnail_url: this.thumbnail_url,
      inventory: this.inventory,
      status: this.status,
      is_featured: this.is_featured,
      is_live_active: this.is_live_active,
      created_at: this.created_at.toISOString(),
      updated_at: this.updated_at.toISOString(),
    }
  }

  /** Plain Object에서 Product Entity 생성 (DB 조회 결과 → Entity) */
  static fromJSON(data) {
    return new Product({
      id: data.id,
      title: data.title,
      product_number: data.product_number,
      price: data.price,
      compare_price: data.compare_price,
      thumbnail_url: data.thumbnail_url,
      inventory: data.inventory,
      status: data.status,
      is_featured: data.is_featured,
      is_live_active: data.is_live_active,
      created_at: data.created_at,
      updated_at: data.updated_at,
    })
  }
}
