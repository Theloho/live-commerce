/**
 * 쿠폰 시스템 API
 * 생성일: 2025-10-03
 * 목적: 쿠폰 발행, 배포, 사용 관리
 */

import { supabase } from './supabase'

const isDevelopment = process.env.NODE_ENV === 'development'

// ==========================================
// 1. 쿠폰 생성 (관리자)
// ==========================================

/**
 * 새 쿠폰 생성
 * @param {Object} couponData - 쿠폰 정보
 * @returns {Object} 생성된 쿠폰
 */
export async function createCoupon(couponData) {
  if (isDevelopment) console.log('🎫 쿠폰 생성 시작:', couponData)

  const { data: currentUser } = await supabase.auth.getUser()

  if (!currentUser?.user) {
    throw new Error('로그인이 필요합니다')
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      code: couponData.code.toUpperCase(),
      name: couponData.name,
      description: couponData.description || null,
      discount_type: couponData.discount_type, // 'fixed_amount' or 'percentage'
      discount_value: couponData.discount_value,
      min_purchase_amount: couponData.min_purchase_amount || 0,
      max_discount_amount: couponData.max_discount_amount || null,
      valid_from: couponData.valid_from,
      valid_until: couponData.valid_until,
      usage_limit_per_user: couponData.usage_limit_per_user || 1,
      total_usage_limit: couponData.total_usage_limit || null,
      is_active: couponData.is_active !== false,
      created_by: currentUser.user.id
    })
    .select()
    .single()

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 생성 실패:', error)
    throw error
  }

  if (isDevelopment) console.log('✅ 쿠폰 생성 완료:', data.code)
  return data
}

// ==========================================
// 2. 쿠폰 조회
// ==========================================

/**
 * 모든 쿠폰 목록 조회 (관리자)
 * @param {Object} filters - 필터 옵션
 * @returns {Array} 쿠폰 목록
 */
export async function getCoupons(filters = {}) {
  if (isDevelopment) console.log('📋 쿠폰 목록 조회:', filters)

  let query = supabase
    .from('coupons')
    .select(`
      *,
      created_by_profile:profiles!coupons_created_by_fkey(name, email)
    `)
    .order('created_at', { ascending: false })

  // 필터 적용
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters.discount_type) {
    query = query.eq('discount_type', filters.discount_type)
  }

  const { data, error } = await query

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 목록 조회 실패:', error)
    throw error
  }

  if (isDevelopment) console.log(`✅ 쿠폰 ${data.length}개 조회 완료`)
  return data
}

/**
 * 단일 쿠폰 상세 조회
 * @param {string} couponId - 쿠폰 ID
 * @returns {Object} 쿠폰 상세 정보
 */
export async function getCoupon(couponId) {
  if (isDevelopment) console.log('🔍 쿠폰 상세 조회:', couponId)

  const { data, error } = await supabase
    .from('coupons')
    .select(`
      *,
      created_by_profile:profiles!coupons_created_by_fkey(name, email)
    `)
    .eq('id', couponId)
    .single()

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 조회 실패:', error)
    throw error
  }

  if (isDevelopment) console.log('✅ 쿠폰 조회 완료:', data.code)
  return data
}

/**
 * 쿠폰 코드로 조회
 * @param {string} code - 쿠폰 코드
 * @returns {Object} 쿠폰 정보
 */
export async function getCouponByCode(code) {
  if (isDevelopment) console.log('🔍 쿠폰 코드 조회:', code)

  const { data, error} = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 코드 조회 실패:', error)
    return null
  }

  if (isDevelopment) console.log('✅ 쿠폰 코드 조회 완료:', data.code)
  return data
}

// ==========================================
// 3. 쿠폰 수정/삭제
// ==========================================

/**
 * 쿠폰 수정
 * @param {string} couponId - 쿠폰 ID
 * @param {Object} updates - 수정할 데이터
 * @returns {Object} 수정된 쿠폰
 */
export async function updateCoupon(couponId, updates) {
  if (isDevelopment) console.log('✏️ 쿠폰 수정:', couponId, updates)

  const { data, error } = await supabase
    .from('coupons')
    .update(updates)
    .eq('id', couponId)
    .select()
    .single()

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 수정 실패:', error)
    throw error
  }

  if (isDevelopment) console.log('✅ 쿠폰 수정 완료:', data.code)
  return data
}

/**
 * 쿠폰 활성화/비활성화
 * @param {string} couponId - 쿠폰 ID
 * @param {boolean} isActive - 활성화 여부
 * @returns {Object} 수정된 쿠폰
 */
export async function toggleCouponStatus(couponId, isActive) {
  if (isDevelopment) console.log(`${isActive ? '✅' : '❌'} 쿠폰 ${isActive ? '활성화' : '비활성화'}:`, couponId)

  return updateCoupon(couponId, { is_active: isActive })
}

/**
 * 쿠폰 삭제 (소프트 삭제 - 비활성화)
 * @param {string} couponId - 쿠폰 ID
 */
export async function deleteCoupon(couponId) {
  if (isDevelopment) console.log('🗑️ 쿠폰 삭제 (비활성화):', couponId)

  return toggleCouponStatus(couponId, false)
}

// ==========================================
// 4. 쿠폰 배포
// ==========================================

/**
 * 특정 사용자에게 쿠폰 배포
 * @param {string} couponId - 쿠폰 ID
 * @param {Array<string>} userIds - 사용자 ID 배열
 * @returns {Object} 배포 결과
 */
export async function distributeCoupon(couponId, userIds) {
  if (isDevelopment) console.log(`📮 쿠폰 배포: ${userIds.length}명에게 배포 시작`)

  const { data: currentUser } = await supabase.auth.getUser()

  if (!currentUser?.user) {
    throw new Error('로그인이 필요합니다')
  }

  // 배포할 사용자 쿠폰 데이터 생성
  const userCoupons = userIds.map(userId => ({
    user_id: userId,
    coupon_id: couponId,
    issued_by: currentUser.user.id,
    issued_at: new Date().toISOString()
  }))

  // 일괄 삽입 (중복은 자동 무시 - UNIQUE 제약조건)
  const { data, error } = await supabase
    .from('user_coupons')
    .upsert(userCoupons, { onConflict: 'user_id,coupon_id', ignoreDuplicates: true })
    .select()

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 배포 실패:', error)
    throw error
  }

  if (isDevelopment) console.log(`✅ 쿠폰 배포 완료: ${data?.length || 0}명에게 배포됨 (중복 제외)`)

  return {
    success: true,
    distributedCount: data?.length || 0,
    requestedCount: userIds.length,
    duplicates: userIds.length - (data?.length || 0)
  }
}

/**
 * 전체 고객에게 쿠폰 배포
 * @param {string} couponId - 쿠폰 ID
 * @returns {Object} 배포 결과
 */
export async function distributeToAllCustomers(couponId) {
  if (isDevelopment) console.log('📮 전체 고객에게 쿠폰 배포 시작')

  // 모든 고객 조회 (is_admin = false)
  const { data: customers, error: customersError } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', false)

  if (customersError) {
    if (isDevelopment) console.error('❌ 고객 목록 조회 실패:', customersError)
    throw customersError
  }

  const userIds = customers.map(c => c.id)
  if (isDevelopment) console.log(`👥 전체 고객 수: ${userIds.length}명`)

  return distributeCoupon(couponId, userIds)
}

// ==========================================
// 5. 쿠폰 보유/사용 조회
// ==========================================

/**
 * 특정 쿠폰 보유 고객 목록
 * @param {string} couponId - 쿠폰 ID
 * @param {Object} filters - 필터 옵션
 * @returns {Array} 보유 고객 목록
 */
export async function getCouponHolders(couponId, filters = {}) {
  if (isDevelopment) console.log('👥 쿠폰 보유 고객 조회:', couponId, filters)

  let query = supabase
    .from('user_coupons')
    .select(`
      *,
      user:profiles!user_coupons_user_id_fkey(id, name, email, phone),
      coupon:coupons(code, name, discount_type, discount_value),
      order:orders(customer_order_number, total_amount)
    `)
    .eq('coupon_id', couponId)
    .order('issued_at', { ascending: false })

  // 필터: 사용 여부
  if (filters.is_used !== undefined) {
    query = query.eq('is_used', filters.is_used)
  }

  const { data, error } = await query

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 보유 고객 조회 실패:', error)
    throw error
  }

  if (isDevelopment) console.log(`✅ ${data.length}명 조회 완료`)
  return data
}

/**
 * 사용자의 보유 쿠폰 목록
 * @param {string} userId - 사용자 ID
 * @param {Object} filters - 필터 옵션
 * @returns {Array} 보유 쿠폰 목록
 */
export async function getUserCoupons(userId, filters = {}) {
  if (isDevelopment) console.log('🎫 사용자 보유 쿠폰 조회:', userId)

  let query = supabase
    .from('user_coupons')
    .select(`
      *,
      coupon:coupons(*)
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false })

  // 필터: 사용 가능한 쿠폰만
  if (filters.available_only) {
    query = query
      .eq('is_used', false)
      .filter('coupon.is_active', 'eq', true)
      .filter('coupon.valid_until', 'gte', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) {
    if (isDevelopment) console.error('❌ 사용자 쿠폰 조회 실패:', error)
    throw error
  }

  if (isDevelopment) console.log(`✅ 쿠폰 ${data.length}개 조회 완료`)
  return data
}

// ==========================================
// 6. 쿠폰 유효성 검증
// ==========================================

/**
 * 쿠폰 유효성 검증 및 할인 금액 계산
 * @param {string} couponCode - 쿠폰 코드
 * @param {string} userId - 사용자 ID
 * @param {number} orderAmount - 주문 금액
 * @returns {Object} 검증 결과 및 할인 금액
 */
export async function validateCoupon(couponCode, userId, orderAmount) {
  if (isDevelopment) console.log('🔍 쿠폰 유효성 검증:', { couponCode, userId, orderAmount })

  const { data, error } = await supabase
    .rpc('validate_coupon', {
      p_coupon_code: couponCode.toUpperCase(),
      p_user_id: userId,
      p_order_amount: orderAmount
    })

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 검증 실패:', error)
    throw error
  }

  const result = data[0]

  if (!result.is_valid) {
    if (isDevelopment) console.log('❌ 쿠폰 사용 불가:', result.error_message)
  } else {
    if (isDevelopment) console.log(`✅ 쿠폰 사용 가능! 할인 금액: ₩${result.discount_amount.toLocaleString()}`)
  }

  return result
}

// ==========================================
// 7. 쿠폰 사용 처리
// ==========================================

/**
 * 쿠폰 사용 처리 (주문 생성 시 호출)
 * @param {string} userId - 사용자 ID
 * @param {string} couponId - 쿠폰 ID
 * @param {string} orderId - 주문 ID
 * @param {number} discountAmount - 할인 금액
 * @returns {boolean} 성공 여부
 */
export async function applyCouponUsage(userId, couponId, orderId, discountAmount) {
  if (isDevelopment) console.log('💳 쿠폰 사용 처리:', { userId, couponId, orderId, discountAmount })

  const { data, error } = await supabase
    .rpc('use_coupon', {
      p_user_id: userId,
      p_coupon_id: couponId,
      p_order_id: orderId,
      p_discount_amount: discountAmount
    })

  if (error) {
    if (isDevelopment) console.error('❌ 쿠폰 사용 실패:', error)
    throw error
  }

  if (!data) {
    if (isDevelopment) console.error('❌ 쿠폰 사용 실패: 이미 사용되었거나 보유하지 않은 쿠폰')
    return false
  }

  if (isDevelopment) console.log('✅ 쿠폰 사용 완료')
  return true
}

// ==========================================
// 8. 통계
// ==========================================

/**
 * 쿠폰 통계 조회
 * @param {string} couponId - 쿠폰 ID
 * @returns {Object} 통계 정보
 */
export async function getCouponStats(couponId) {
  if (isDevelopment) console.log('📊 쿠폰 통계 조회:', couponId)

  const { data: coupon, error: couponError } = await getCoupon(couponId)

  // 쿠폰 조회 실패 시 기본 통계 반환
  if (!coupon || couponError) {
    if (isDevelopment) console.error('❌ 쿠폰 조회 실패:', couponError)
    return {
      total_issued: 0,
      total_used: 0,
      usage_rate: 0,
      unused_count: 0,
      remaining_limit: null
    }
  }

  const { data: holders } = await getCouponHolders(couponId)
  const usedCount = holders?.filter(h => h.is_used).length || 0
  const unusedCount = holders?.filter(h => !h.is_used).length || 0

  const stats = {
    total_issued: coupon.total_issued_count,
    total_used: coupon.total_used_count,
    usage_rate: coupon.total_issued_count > 0
      ? ((coupon.total_used_count / coupon.total_issued_count) * 100).toFixed(1)
      : 0,
    unused_count: unusedCount,
    remaining_limit: coupon.total_usage_limit
      ? coupon.total_usage_limit - coupon.total_used_count
      : null
  }

  if (isDevelopment) console.log('✅ 쿠폰 통계:', stats)
  return stats
}

/**
 * 전체 쿠폰 통계 조회 (대시보드용)
 * @returns {Object} 전체 통계
 */
export async function getAllCouponsStats() {
  if (isDevelopment) console.log('📊 전체 쿠폰 통계 조회')

  const { data: coupons } = await getCoupons()

  const stats = {
    total_coupons: coupons.length,
    active_coupons: coupons.filter(c => c.is_active).length,
    total_issued: coupons.reduce((sum, c) => sum + c.total_issued_count, 0),
    total_used: coupons.reduce((sum, c) => sum + c.total_used_count, 0),
    fixed_amount_coupons: coupons.filter(c => c.discount_type === 'fixed_amount').length,
    percentage_coupons: coupons.filter(c => c.discount_type === 'percentage').length
  }

  if (isDevelopment) console.log('✅ 전체 쿠폰 통계:', stats)
  return stats
}

// ==========================================
// Export All
// ==========================================
export default {
  createCoupon,
  getCoupons,
  getCoupon,
  getCouponByCode,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  distributeCoupon,
  distributeToAllCustomers,
  getCouponHolders,
  getUserCoupons,
  validateCoupon,
  useCoupon,
  getCouponStats,
  getAllCouponsStats
}
