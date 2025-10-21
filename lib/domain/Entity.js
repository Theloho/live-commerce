/**
 * Entity
 *
 * Domain Layer의 기본 엔티티 클래스
 * 비즈니스 로직과 검증을 포함하는 도메인 모델
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

/**
 * Entity 베이스 클래스
 *
 * Entity = 도메인 모델의 핵심
 * - 고유한 ID를 가진 객체
 * - 비즈니스 로직 포함
 * - 불변성 (Immutability) 유지 권장
 *
 * @example
 * export class Order extends Entity {
 *   constructor({ id, customer_order_number, status, items }) {
 *     super(id)
 *     this.customer_order_number = customer_order_number
 *     this.status = status
 *     this.items = items
 *   }
 *
 *   calculateTotal() {
 *     return this.items.reduce((sum, item) => sum + item.total, 0)
 *   }
 *
 *   canBeCancelled() {
 *     return ['pending', 'verifying'].includes(this.status)
 *   }
 * }
 */
export class Entity {
  /**
   * @param {string} id - 엔티티 고유 ID (UUID)
   */
  constructor(id) {
    if (!id) {
      throw new Error('Entity ID는 필수입니다.')
    }

    this._id = id
    this._createdAt = new Date()
  }

  /**
   * 엔티티 ID (읽기 전용)
   * @returns {string}
   */
  get id() {
    return this._id
  }

  /**
   * 생성 시간 (읽기 전용)
   * @returns {Date}
   */
  get createdAt() {
    return this._createdAt
  }

  /**
   * 엔티티 동등성 비교
   *
   * 두 엔티티가 같은지 ID로 비교
   *
   * @param {Entity} other - 비교할 엔티티
   * @returns {boolean}
   */
  equals(other) {
    if (!other || !(other instanceof Entity)) {
      return false
    }

    return this.id === other.id
  }

  /**
   * 엔티티 복사 (Shallow Copy)
   *
   * @returns {Entity}
   */
  clone() {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }

  /**
   * 엔티티를 Plain Object로 변환
   *
   * DB 저장 또는 JSON 직렬화 시 사용
   *
   * @returns {object}
   */
  toJSON() {
    const json = {}

    // this의 모든 속성을 plain object로 복사
    for (const key in this) {
      if (this.hasOwnProperty(key) && !key.startsWith('_')) {
        json[key] = this[key]
      }
    }

    // id는 항상 포함
    json.id = this.id

    return json
  }

  /**
   * 디버깅용 문자열 표현
   *
   * @returns {string}
   */
  toString() {
    return `${this.constructor.name}(id=${this.id})`
  }

  /**
   * 엔티티 검증
   *
   * ⚠️ 주의: 자식 클래스에서 override 하여 사용
   *
   * @throws {ValidationError} 검증 실패 시
   */
  validate() {
    // 기본 구현: 아무것도 하지 않음
    // 자식 클래스에서 필요 시 override
  }
}
