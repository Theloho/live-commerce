/**
 * 도서산간 지역 판별 및 추가 배송비 계산 유틸리티
 */

// 제주도 우편번호 범위
const JEJU_POSTAL_CODES = [
  { start: 63000, end: 63644 } // 제주특별자치도
]

// 울릉도/독도 우편번호 범위
const ULLEUNG_POSTAL_CODES = [
  { start: 40200, end: 40240 } // 울릉군
]

// 기타 도서산간 지역 우편번호 (주요 섬 지역)
const REMOTE_ISLAND_POSTAL_CODES = [
  { start: 23000, end: 23999 }, // 인천 옹진군 (백령도, 연평도 등)
  { start: 53031, end: 53033 }, // 경남 거제시 일부 섬
  { start: 59100, end: 59166 }, // 전남 신안군
  { start: 58800, end: 58810 }, // 전남 진도군 일부 섬
  { start: 59421, end: 59470 }, // 전남 완도군
  { start: 59531, end: 59563 }, // 전남 진도군
  { start: 58760, end: 58762 }, // 전남 해남군 일부 섬
  { start: 53081, end: 53104 }  // 경남 통영시 일부 섬
]

// 추가 배송비 (원)
const SHIPPING_SURCHARGE = {
  JEJU: 3000,      // 제주도
  ULLEUNG: 5000,   // 울릉도/독도
  REMOTE: 5000     // 기타 도서산간
}

/**
 * 우편번호가 특정 범위 내에 있는지 확인
 * @param {string} postalCode - 우편번호 (5자리)
 * @param {Array} ranges - 범위 배열 [{start, end}, ...]
 * @returns {boolean}
 */
function isInRange(postalCode, ranges) {
  if (!postalCode) return false

  const code = parseInt(postalCode.replace(/[^0-9]/g, ''))
  if (isNaN(code)) return false

  return ranges.some(range => code >= range.start && code <= range.end)
}

/**
 * 도서산간 지역 여부 판별 및 추가 배송비 계산
 * @param {string} postalCode - 우편번호 (5자리)
 * @returns {Object} { isRemote, region, surcharge }
 */
export function calculateShippingSurcharge(postalCode) {
  if (!postalCode) {
    return {
      isRemote: false,
      region: null,
      surcharge: 0
    }
  }

  // 제주도 체크
  if (isInRange(postalCode, JEJU_POSTAL_CODES)) {
    return {
      isRemote: true,
      region: '제주',
      surcharge: SHIPPING_SURCHARGE.JEJU
    }
  }

  // 울릉도/독도 체크
  if (isInRange(postalCode, ULLEUNG_POSTAL_CODES)) {
    return {
      isRemote: true,
      region: '울릉도/독도',
      surcharge: SHIPPING_SURCHARGE.ULLEUNG
    }
  }

  // 기타 도서산간 체크
  if (isInRange(postalCode, REMOTE_ISLAND_POSTAL_CODES)) {
    return {
      isRemote: true,
      region: '도서산간',
      surcharge: SHIPPING_SURCHARGE.REMOTE
    }
  }

  // 일반 지역
  return {
    isRemote: false,
    region: null,
    surcharge: 0
  }
}

/**
 * 배송비 정보 포맷팅
 * @param {number} baseShipping - 기본 배송비
 * @param {string} postalCode - 우편번호
 * @returns {Object} { baseShipping, surcharge, totalShipping, region }
 */
export function formatShippingInfo(baseShipping = 0, postalCode) {
  const { isRemote, region, surcharge } = calculateShippingSurcharge(postalCode)

  // 무료배송이면 추가배송비도 면제 (합배 처리)
  const finalSurcharge = baseShipping > 0 ? surcharge : 0

  return {
    baseShipping,
    surcharge: finalSurcharge,
    totalShipping: baseShipping + finalSurcharge,
    isRemote,
    region
  }
}
