/**
 * Inventory Value Object - 재고 관리 도메인 모델
 * @author Claude
 * @since 2025-10-21
 */

/**
 * Inventory - 재고 수량 및 가용성 관리
 *
 * Value Object 패턴 적용:
 * - 불변성 (Immutability): reserve/release는 새 객체 반환
 * - 값 비교 (Equality by Value)
 * - 고유 ID 없음
 */
export class Inventory {
  /**
   * @param {number} quantity - 재고 수량 (>= 0)
   */
  constructor(quantity) {
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new Error('재고 수량은 0 이상이어야 합니다.')
    }

    this._quantity = quantity
  }

  /**
   * 재고 수량 (읽기 전용)
   * @returns {number}
   */
  get quantity() {
    return this._quantity
  }

  /**
   * 재고 가용성 확인
   *
   * @param {number} required - 필요한 수량
   * @returns {boolean} 재고가 충분하면 true
   *
   * @example
   * const inventory = new Inventory(10)
   * inventory.checkAvailability(5)  // true
   * inventory.checkAvailability(15) // false
   */
  checkAvailability(required) {
    if (typeof required !== 'number' || required < 0) {
      throw new Error('요구 수량은 0 이상이어야 합니다.')
    }

    return this._quantity >= required
  }

  /**
   * 재고 예약 (감소)
   *
   * 불변성 유지: 새로운 Inventory 객체 반환
   *
   * @param {number} quantity - 예약할 수량
   * @returns {Inventory} 새로운 Inventory 객체 (재고 감소)
   * @throws {Error} 재고 부족 시 에러
   *
   * @example
   * const inventory = new Inventory(10)
   * const newInventory = inventory.reserve(3) // Inventory(7)
   * console.log(inventory.quantity)    // 10 (원본 불변)
   * console.log(newInventory.quantity) // 7
   */
  reserve(quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('예약 수량은 0보다 커야 합니다.')
    }

    if (!this.checkAvailability(quantity)) {
      throw new Error(`재고 부족: 현재 ${this._quantity}개, 요청 ${quantity}개`)
    }

    return new Inventory(this._quantity - quantity)
  }

  /**
   * 재고 해제 (증가)
   *
   * 불변성 유지: 새로운 Inventory 객체 반환
   *
   * @param {number} quantity - 해제할 수량
   * @returns {Inventory} 새로운 Inventory 객체 (재고 증가)
   * @throws {Error} 수량이 유효하지 않으면 에러
   *
   * @example
   * const inventory = new Inventory(10)
   * const newInventory = inventory.release(5) // Inventory(15)
   */
  release(quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('해제 수량은 0보다 커야 합니다.')
    }

    return new Inventory(this._quantity + quantity)
  }

  /**
   * 재고가 있는지 확인
   * @returns {boolean}
   */
  isAvailable() {
    return this._quantity > 0
  }

  /**
   * 재고가 없는지 확인
   * @returns {boolean}
   */
  isEmpty() {
    return this._quantity === 0
  }

  /**
   * 값 비교 (Value Object)
   *
   * @param {Inventory} other - 비교할 Inventory
   * @returns {boolean}
   */
  equals(other) {
    if (!other || !(other instanceof Inventory)) {
      return false
    }

    return this._quantity === other._quantity
  }

  /**
   * 문자열 표현
   * @returns {string}
   */
  toString() {
    return `Inventory(${this._quantity})`
  }

  /**
   * Plain Number로 변환
   * @returns {number}
   */
  toNumber() {
    return this._quantity
  }

  /**
   * Number에서 Inventory 생성
   * @param {number} quantity
   * @returns {Inventory}
   */
  static fromNumber(quantity) {
    return new Inventory(quantity)
  }
}
