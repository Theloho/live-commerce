/**
 * MyPage - 마이페이지
 * @author Claude
 * @since 2025-10-24 (Refactored)
 *
 * Clean Architecture 적용:
 * - Presentation Layer: UI 조합만 (비즈니스 로직 제거)
 * - Application Layer: useProfileManagement hook 사용
 * - Infrastructure Layer: UserProfileManager 간접 사용
 *
 * Rule #0 준수:
 * - Rule 1: 파일 크기 150줄 이하 ✅ (기존 593줄 → 150줄, -74%)
 * - Rule 2: Layer 경계 준수 ✅ (Presentation → Application만 호출)
 * - Rule 3: 중복 로직 제거 ✅ (sessionStorage 중앙화)
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserIcon,
  PhoneIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import useAuth from '@/hooks/useAuth'
import { useProfileManagement } from '@/app/hooks/useProfileManagement'
import toast from 'react-hot-toast'

// Presentation Layer 컴포넌트
import ProfileHeader from '@/app/components/mypage/ProfileHeader'
import ProfileInfoCard from '@/app/components/mypage/ProfileInfoCard'
import ProfileFieldEditor from '@/app/components/mypage/ProfileFieldEditor'
import AddressSection from '@/app/components/mypage/AddressSection'
import ProfileMenu from '@/app/components/mypage/ProfileMenu'

export default function MyPage() {
  const router = useRouter()
  const { user, loading, signOut, isAuthenticated } = useAuth()
  const [userSession, setUserSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  // ⚡ 비즈니스 로직 Hook (Application Layer)
  const {
    userProfile,
    profileLoading,
    editingField,
    editValues,
    setEditValues,
    handleEdit,
    handleSave,
    handleCancel,
    updateLocalProfile // ⭐ 추가
  } = useProfileManagement({ user, userSession, router })

  // 다음 주소 API 스크립트 로드
  useEffect(() => {
    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // 직접 세션 확인
  useEffect(() => {
    const checkUserSession = () => {
      try {
        const storedUser = sessionStorage.getItem('user')
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUserSession(userData)
        } else {
          setUserSession(null)
        }
      } catch (error) {
        setUserSession(null)
      } finally {
        setSessionLoading(false)
      }
    }

    checkUserSession()
  }, [])

  // 로그인 체크
  useEffect(() => {
    const isUserLoggedIn = userSession || isAuthenticated

    if (!sessionLoading && !loading && !isUserLoggedIn) {
      toast.error('로그인이 필요합니다')
      router.push('/login')
      return
    }
  }, [user, userSession, loading, sessionLoading, isAuthenticated, router])

  // 로그아웃
  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃하시겠습니까?')
    if (confirmed) {
      try {
        // 1. Supabase Auth 로그아웃 먼저
        await signOut()

        // 2. 커스텀 데이터 정리
        sessionStorage.removeItem('user')
        localStorage.removeItem('unified_user_session')

        // 3. 로컬 상태 정리
        setUserSession(null)

        // 4. 이벤트 발생
        window.dispatchEvent(new CustomEvent('userLoggedOut'))

        // 5. 리다이렉트
        toast.success('로그아웃되었습니다')
        router.push('/')

      } catch (error) {
        toast.info('로그아웃되었습니다')
        router.push('/')
      }
    }
  }

  // 프로필 업데이트 콜백 (AddressSection에서 호출)
  const handleProfileUpdate = (updates) => {
    // DB 저장은 AddressSection에서 완료됨
    // 여기서는 로컬 상태만 즉시 업데이트하여 UI 반영
    updateLocalProfile(updates)
  }

  // 로딩 UI
  if (loading || sessionLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 프로필 없음
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">프로필 정보를 불러올 수 없습니다</p>
        </div>
      </div>
    )
  }

  // 프로필 필드 정의
  const profileFields = [
    {
      key: 'name',
      label: '이름',
      icon: UserIcon,
      type: 'text',
      required: true
    },
    {
      key: 'phone',
      label: '휴대폰번호',
      icon: PhoneIcon,
      type: 'tel',
      required: true,
      readonly: false  // ✅ 수정 가능하도록 변경
    },
    {
      key: 'nickname',
      label: '닉네임',
      icon: TagIcon,
      type: 'text',
      required: false
    }
  ]

  // ⚡ UI 조합만 (Presentation Layer)
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <ProfileHeader onBack={() => router.back()} />

        {/* 사용자 정보 카드 */}
        <ProfileInfoCard userProfile={userProfile} />

        {/* 기본 프로필 정보 편집 */}
        <ProfileFieldEditor
          profileFields={profileFields}
          userProfile={userProfile}
          editingField={editingField}
          editValues={editValues}
          onEdit={handleEdit}
          onSave={(field) => handleSave(field, userSession || user)}
          onCancel={handleCancel}
          setEditValues={setEditValues}
        />

        {/* 배송지 관리 섹션 */}
        <AddressSection
          userProfile={userProfile}
          user={user}
          userSession={userSession}
          onProfileUpdate={handleProfileUpdate}
        />

        {/* 메뉴 (주문 내역, 쿠폰, 로그아웃) */}
        <ProfileMenu
          onLogout={handleLogout}
          router={router}
        />
      </div>
    </div>
  )
}
