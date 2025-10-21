/**
 * BaseUseCase
 *
 * 모든 Use Case의 Base 클래스
 * Application Layer의 기본 로직 제공
 *
 * @author Claude
 * @since 2025-10-21
 * @version 1.0
 */

/**
 * Use Case 베이스 클래스
 *
 * Use Case = Application Layer의 핵심
 * - UI (Presentation)와 Domain/Infrastructure를 연결
 * - 비즈니스 플로우 구현
 * - 트랜잭션 관리
 *
 * @example
 * export class CreateOrderUseCase extends BaseUseCase {
 *   async execute({ items, userProfile }) {
 *     // 1. 검증
 *     this.validate({ items, userProfile })
 *
 *     // 2. 비즈니스 로직 실행
 *     const order = await this.orderRepo.create({ ... })
 *
 *     // 3. Domain 모델로 반환
 *     return new Order(order)
 *   }
 * }
 */
export class BaseUseCase {
  /**
   * Use Case 실행
   *
   * ⚠️ 주의: 반드시 자식 클래스에서 override 해야 함
   *
   * @param {object} params - Use Case 실행에 필요한 파라미터
   * @returns {Promise<any>} 실행 결과
   * @throws {Error} override하지 않으면 에러 발생
   */
  async execute(params) {
    throw new Error(`execute() must be implemented in ${this.constructor.name}`)
  }

  /**
   * 입력 검증 (선택)
   *
   * 자식 클래스에서 필요 시 override
   *
   * @param {object} params - 검증할 파라미터
   * @throws {ValidationError} 검증 실패 시
   */
  validate(params) {
    // 기본 구현: 아무것도 하지 않음
    // 자식 클래스에서 필요 시 override
  }

  /**
   * 에러 핸들링 (공통)
   *
   * @param {Error} error - 발생한 에러
   * @param {string} context - 에러 발생 컨텍스트 (로깅용)
   * @throws {Error} 처리된 에러
   */
  handleError(error, context = '') {
    const className = this.constructor.name
    console.error(`[${className}] ${context} 에러:`, error)

    // 에러를 그대로 throw (상위 레이어에서 처리)
    throw error
  }

  /**
   * 로깅 (공통)
   *
   * @param {string} message - 로그 메시지
   * @param {object} data - 추가 데이터 (선택)
   */
  log(message, data = null) {
    const className = this.constructor.name
    if (data) {
      console.log(`[${className}] ${message}`, data)
    } else {
      console.log(`[${className}] ${message}`)
    }
  }
}
