// 사용자 프로필 통합 관리 모듈
// 카카오 사용자와 일반 사용자의 프로필 정보를 일관되게 처리

import { supabase } from './supabase'

/**
 * 사용자 프로필 정보를 통합 관리하는 클래스
 */
export class UserProfileManager {
  /**
   * 현재 로그인한 사용자 정보 가져오기
   * Supabase Auth 세션 우선 확인, 없으면 sessionStorage 확인
   */
  static async getCurrentUser() {
    try {
      // 1. Supabase Auth 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('❌ 세션 조회 오류:', sessionError)
        // 에러 발생 시에도 sessionStorage 확인 계속 진행
      }

      if (session?.user) {
        // 2. profiles 테이블에서 사용자 정보 조회
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.error('❌ 프로필 조회 오류:', profileError)
          // 프로필이 없어도 세션 user 정보는 반환
          return {
            id: session.user.id,
            email: session.user.email,
            ...session.user.user_metadata
          }
        }

        return profile
      }

      // 3. Auth 세션이 없으면 sessionStorage 확인 (카카오 사용자)
      if (typeof window !== 'undefined' && sessionStorage) {
        try {
          const storedUser = sessionStorage.getItem('user')
          if (storedUser) {
            const sessionUser = JSON.parse(storedUser)
            return sessionUser
          }
        } catch (storageError) {
          // sessionStorage 읽기 실패는 조용히 처리
        }
      }

      // 4. 둘 다 없으면 null 반환
      return null

    } catch (error) {
      console.error('❌ getCurrentUser 에러:', error)
      return null
    }
  }

  /**
   * 특정 사용자 ID로 프로필 정보 조회
   * @param {string} userId - 사용자 ID
   * @returns {Object|null} 프로필 정보 또는 null
   */
  static async loadUserProfile(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ loadUserProfile 오류:', error)
        return null
      }

      return profile
    } catch (error) {
      console.error('❌ loadUserProfile 예외:', error)
      return null
    }
  }

  /**
   * 사용자 주문 조회를 위한 통합 식별자 반환
   * 카카오 사용자와 일반 사용자를 구분하여 적절한 조회 조건 반환
   */
  static async getUserOrderQuery() {
    const currentUser = await this.getCurrentUser()

    if (!currentUser) {
      throw new Error('로그인이 필요합니다')
    }

    // 카카오 사용자인 경우
    if (currentUser.kakao_id) {
      return {
        type: 'kakao',
        query: {
          column: 'order_type',
          value: `direct:KAKAO:${currentUser.kakao_id}`
        },
        // 기존 주문과의 호환성을 위한 대체 조회 조건들
        alternativeQueries: [
          {
            column: 'order_type',
            value: `cart:KAKAO:${currentUser.kakao_id}`
          },
          {
            column: 'order_type',
            value: `direct:KAKAO:${currentUser.id}`
          },
          {
            column: 'order_type',
            value: `cart:KAKAO:${currentUser.id}`
          }
        ],
        fallback: {
          column: 'order_shipping.name',
          value: currentUser.name
        }
      }
    }

    // 일반 사용자인 경우 (Supabase auth)
    if (currentUser.id) {
      return {
        type: 'supabase',
        query: {
          column: 'user_id',
          value: currentUser.id
        }
      }
    }

    throw new Error('사용자 식별 정보가 없습니다')
  }

  /**
   * 사용자 프로필 정규화
   * 카카오/일반 사용자 관계없이 일관된 형식으로 반환
   */
  static normalizeProfile(user) {
    if (!user) {
      return {
        name: '',
        phone: '',
        address: '',
        detail_address: '',
        addresses: [],
        isValid: false
      }
    }

    let profile = {
      name: '',
      phone: '',
      address: '',
      detail_address: '',
      addresses: [],
      isValid: false
    }

    // 카카오 사용자 형식
    if (user.phone !== undefined && user.address !== undefined) {
      profile = {
        name: user.name || user.nickname || '',
        phone: user.phone || '',
        address: user.address || '',
        detail_address: user.detail_address || '',
        addresses: user.addresses || [],
        isValid: this.validateProfile({
          name: user.name || user.nickname,
          phone: user.phone,
          address: user.address
        })
      }
    }
    // Supabase 사용자 형식 (user_metadata 사용)
    else if (user.user_metadata) {
      profile = {
        name: user.user_metadata.name || user.user_metadata.full_name || '',
        phone: user.user_metadata.phone || '',
        address: user.user_metadata.address || '',
        detail_address: user.user_metadata.detail_address || '',
        addresses: user.user_metadata.addresses || [],
        isValid: this.validateProfile({
          name: user.user_metadata.name,
          phone: user.user_metadata.phone,
          address: user.user_metadata.address
        })
      }
    }
    // 기타 형식
    else {
      profile = {
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        detail_address: user.detail_address || '',
        addresses: user.addresses || [],
        isValid: this.validateProfile(user)
      }
    }

    // addresses 배열이 비어있지만 기본 주소가 있는 경우 자동 변환
    if ((!profile.addresses || profile.addresses.length === 0) && profile.address) {
      profile.addresses = [{
        id: 1,
        label: '기본 배송지',
        address: profile.address,
        detail_address: profile.detail_address || '',
        is_default: true
      }]
    }

    return profile
  }

  /**
   * 프로필 유효성 검사
   * 필수 정보가 모두 있는지 확인
   */
  static validateProfile(profile) {
    if (!profile) return false

    const hasName = profile.name && profile.name.trim().length > 0
    const hasPhone = profile.phone && profile.phone.trim().length >= 10
    const hasAddress = profile.address && profile.address.trim().length > 0

    return hasName && hasPhone && hasAddress
  }

  /**
   * 통합 프로필 업데이트 - 모든 저장소를 원자적으로 업데이트
   * @param {string} userId - 사용자 ID
   * @param {object} profileData - 업데이트할 프로필 데이터
   * @param {boolean} isKakaoUser - 카카오 사용자 여부
   */
  static async atomicProfileUpdate(userId, profileData, isKakaoUser = false) {
    if (!userId) {
      throw new Error('사용자 ID가 필요합니다')
    }

    // 유효성 검사 (필수 필드가 있는 경우만)
    const hasRequiredFields = profileData.name && profileData.phone && profileData.address
    if (hasRequiredFields && !this.validateProfile(profileData)) {
      throw new Error('필수 정보를 모두 입력해주세요')
    }

    try {
      // 병렬 업데이트로 성능 최적화
      const updatePromises = []

      // 1. profiles 테이블 업데이트 (항상 실행)
      const updateData = {
        id: userId,
        updated_at: new Date().toISOString()
      }

      // profileData에서 제공된 필드만 업데이트 (undefined 필드 제외)
      if (profileData.name !== undefined) updateData.name = profileData.name
      if (profileData.phone !== undefined) updateData.phone = profileData.phone
      if (profileData.nickname !== undefined) updateData.nickname = profileData.nickname
      if (profileData.address !== undefined) updateData.address = profileData.address
      if (profileData.detail_address !== undefined) updateData.detail_address = profileData.detail_address
      if (profileData.postal_code !== undefined) updateData.postal_code = profileData.postal_code
      if (profileData.addresses !== undefined) updateData.addresses = profileData.addresses  // ⭐ 추가

      updatePromises.push(
        supabase
          .from('profiles')
          .upsert(updateData)
          .select()
          .single()
      )

      // 2. auth.users user_metadata 업데이트 (항상 실행 - 관리자 페이지용)
      const metadataUpdate = {
        profile_completed: true,
        updated_at: new Date().toISOString()
      }

      // profileData에서 제공된 필드만 추가
      if (profileData.name !== undefined) metadataUpdate.name = profileData.name
      if (profileData.phone !== undefined) metadataUpdate.phone = profileData.phone
      if (profileData.nickname !== undefined) metadataUpdate.nickname = profileData.nickname
      if (profileData.address !== undefined) metadataUpdate.address = profileData.address
      if (profileData.detail_address !== undefined) metadataUpdate.detail_address = profileData.detail_address
      if (profileData.postal_code !== undefined) metadataUpdate.postal_code = profileData.postal_code
      if (profileData.addresses !== undefined) metadataUpdate.addresses = profileData.addresses  // ⭐ 추가

      updatePromises.push(
        supabase.auth.updateUser({
          data: metadataUpdate
        })
      )

      // 병렬 실행으로 성능 최적화
      const [profileResult, metadataResult] = await Promise.allSettled(updatePromises)

      // 결과 검증
      if (profileResult.status === 'rejected') {
        console.error('❌ profiles 업데이트 실패:', profileResult.reason)
        throw new Error('프로필 정보 저장 실패')
      }

      if (metadataResult.status === 'rejected') {
        console.warn('⚠️ user_metadata 업데이트 실패:', metadataResult.reason)
        // 경고만 하고 계속 진행 (중요하지만 치명적이지 않음)
      }

      // 3. 카카오 사용자인 경우 sessionStorage 업데이트
      if (isKakaoUser) {
        try {
          const currentSession = sessionStorage.getItem('user')
          if (currentSession) {
            const sessionData = JSON.parse(currentSession)
            const updatedSession = {
              ...sessionData,
              ...profileData,
              updated_at: new Date().toISOString()
            }
            sessionStorage.setItem('user', JSON.stringify(updatedSession))
          }
        } catch (error) {
          console.warn('⚠️ sessionStorage 업데이트 실패:', error)
        }
      }

      return { success: true, data: profileResult.value?.data }

    } catch (error) {
      console.error('❌ 통합 프로필 업데이트 실패:', error)
      throw error
    }
  }

  /**
   * 프로필 업데이트 (레거시 호환성 유지)
   * @deprecated atomicProfileUpdate 사용 권장
   */
  static async updateProfile(userId, profileData) {
    console.warn('⚠️ updateProfile은 deprecated입니다. atomicProfileUpdate 사용을 권장합니다.')
    return this.atomicProfileUpdate(userId, profileData, false)
  }

  /**
   * 배송 정보 생성용 데이터 준비
   * 주문 생성 시 사용
   */
  static prepareShippingData(profile) {
    const normalized = this.normalizeProfile(profile)

    // 유효성 검사
    if (!normalized.isValid) {
      throw new Error('배송을 위한 필수 정보가 누락되었습니다 (이름, 연락처, 주소)')
    }

    return {
      name: normalized.name,
      phone: normalized.phone,
      address: normalized.address,
      detail_address: normalized.detail_address || ''
    }
  }

  /**
   * 프로필 완성도 체크
   * 미완성 필드 목록 반환
   */
  static checkCompleteness(profile) {
    const normalized = this.normalizeProfile(profile)
    const missing = []

    if (!normalized.name || normalized.name.trim().length === 0) {
      missing.push('이름')
    }
    if (!normalized.phone || normalized.phone.trim().length < 10) {
      missing.push('연락처')
    }
    if (!normalized.address || normalized.address.trim().length === 0) {
      missing.push('배송지 주소')
    }

    return {
      isComplete: missing.length === 0,
      missingFields: missing
    }
  }
}

// 배송 정보 관리 헬퍼
export class ShippingDataManager {
  /**
   * 주문의 배송 정보 가져오기
   * 다양한 데이터 구조 대응
   */
  static extractShippingInfo(order) {
    if (!order) return null

    // 1. order_shipping 배열 확인 (가장 정확한 소스)
    if (order.order_shipping && Array.isArray(order.order_shipping) && order.order_shipping.length > 0) {
      const shipping = order.order_shipping[0]
      return {
        name: shipping.name || '',
        phone: shipping.phone || '',
        address: shipping.address || '',
        detail_address: shipping.detail_address || ''
      }
    }

    // 2. order_shipping 객체 확인
    if (order.order_shipping && typeof order.order_shipping === 'object' && !Array.isArray(order.order_shipping)) {
      return {
        name: order.order_shipping.name || '',
        phone: order.order_shipping.phone || '',
        address: order.order_shipping.address || '',
        detail_address: order.order_shipping.detail_address || ''
      }
    }

    // 3. 직접 필드 확인 (레거시 데이터)
    if (order.userName || order.userPhone || order.userAddress) {
      return {
        name: order.userName || '',
        phone: order.userPhone || '',
        address: order.userAddress || '',
        detail_address: order.userDetailAddress || ''
      }
    }

    // 4. user 객체 확인
    if (order.user) {
      return {
        name: order.user.name || '',
        phone: order.user.phone || '',
        address: order.user.address || '',
        detail_address: order.user.detail_address || ''
      }
    }

    return null
  }

  /**
   * 배송 정보 유효성 검사
   */
  static validateShippingInfo(shippingInfo) {
    if (!shippingInfo) return false

    const hasName = shippingInfo.name && shippingInfo.name.trim().length > 0
    const hasPhone = shippingInfo.phone && shippingInfo.phone.trim().length >= 10
    const hasAddress = shippingInfo.address && shippingInfo.address.trim().length > 0

    return hasName && hasPhone && hasAddress
  }
}

export default UserProfileManager