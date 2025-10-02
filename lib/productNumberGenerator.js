import { supabase } from './supabase'

/**
 * 중앙 관리 상품번호 생성 함수
 * 동시성 문제 해결을 위해 간단한 재시도 로직 사용
 * @returns {Promise<string>} 생성된 상품번호 (0001~9999)
 */
export async function generateProductNumber() {
  const maxRetries = 5
  let attempt = 0

  while (attempt < maxRetries) {
    try {
      // 1. 현재 사용 중인 모든 상품번호 조회
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('product_number')
        .not('product_number', 'is', null)
        .order('product_number', { ascending: true })

      if (fetchError) {
        console.error('상품번호 조회 오류:', fetchError)
        throw new Error('상품번호 조회 실패')
      }

      // 2. 사용 중인 번호 파싱 (0001~9999만)
      const usedNumbers = new Set(
        (products || [])
          .map(p => {
            if (!p.product_number) return null
            const num = parseInt(p.product_number)
            return (num >= 1 && num <= 9999) ? num : null
          })
          .filter(num => num !== null)
      )

      // 3. 가장 작은 빈 번호 찾기
      let nextNumber = null
      for (let i = 1; i <= 9999; i++) {
        if (!usedNumbers.has(i)) {
          nextNumber = i
          break
        }
      }

      // 4. 모든 번호가 사용 중이면 마지막 + 1
      if (!nextNumber) {
        nextNumber = Math.max(...Array.from(usedNumbers), 0) + 1
      }

      // 5. 4자리 문자열로 변환
      const productNumber = String(nextNumber).padStart(4, '0')

      console.log('✅ 상품번호 생성:', productNumber)
      return productNumber

    } catch (error) {
      attempt++
      if (attempt >= maxRetries) {
        console.error('상품번호 생성 최종 실패:', error)
        throw error
      }
      // 짧은 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 100 * attempt))
    }
  }

  throw new Error('상품번호 생성 실패: 최대 재시도 횟수 초과')
}
