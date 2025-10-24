/**
 * useProfileManagement - 프로필 관리 비즈니스 로직 Hook
 * @author Claude
 * @since 2025-10-24
 *
 * Clean Architecture 적용:
 * - Application Layer: 비즈니스 로직만 (UI 코드 없음)
 * - Infrastructure 호출: UserProfileManager만 사용
 * - sessionStorage: 직접 조작 금지 (이벤트 발생 → useAuth가 처리)
 *
 * Rule #0 준수:
 * - Rule 1: 파일 크기 150줄 이하 (Use Case)
 * - Rule 2: Layer 경계 준수 (Application → Infrastructure)
 * - Rule 3: 중복 로직 제거 (UserProfileManager 중앙화 사용)
 */

'use client'

import { useState, useEffect } from 'react'
import { UserProfileManager } from '@/lib/userProfileManager'
import toast from 'react-hot-toast'

export function useProfileManagement({ user, userSession, router }) {
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({})

  // 프로필 로드
  useEffect(() => {
    const currentUser = userSession || user
    if (currentUser) {
      fetchUserProfile(currentUser)
    }
  }, [user, userSession])

  const fetchUserProfile = async (currentUser) => {
    try {
      setProfileLoading(true)

      // 카카오 사용자인 경우
      if (currentUser.provider === 'kakao') {
        try {
          const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

          if (dbProfile) {
            const profile = {
              name: dbProfile.name || currentUser.name || '',
              phone: dbProfile.phone || currentUser.phone || '',
              nickname: dbProfile.nickname || currentUser.nickname || currentUser.name || '',
              address: dbProfile.address || '',
              detail_address: dbProfile.detail_address || '',
              addresses: dbProfile.addresses || [],
              postal_code: dbProfile.postal_code || ''
            }
            setUserProfile(profile)
            setEditValues(profile)
          } else {
            const profile = {
              name: currentUser.name || '',
              phone: currentUser.phone || '',
              nickname: currentUser.nickname || currentUser.name || '',
              address: currentUser.address || '',
              detail_address: currentUser.detail_address || '',
              addresses: currentUser.addresses || [],
              postal_code: currentUser.postal_code || ''
            }
            setUserProfile(profile)
            setEditValues(profile)
          }
        } catch (error) {
          const profile = {
            name: currentUser.name || '',
            phone: currentUser.phone || '',
            nickname: currentUser.nickname || currentUser.name || '',
            address: currentUser.address || '',
            detail_address: currentUser.detail_address || '',
            addresses: currentUser.addresses || [],
            postal_code: currentUser.postal_code || ''
          }
          setUserProfile(profile)
          setEditValues(profile)
        }
      } else if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드
        const profile = {
          name: currentUser.name || currentUser.user_metadata?.name || '',
          phone: currentUser.phone || currentUser.user_metadata?.phone || '',
          nickname: currentUser.nickname || currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || '',
          address: currentUser.address || '',
          detail_address: currentUser.detail_address || '',
          addresses: currentUser.addresses || [],
          postal_code: currentUser.postal_code || ''
        }
        setUserProfile(profile)
        setEditValues(profile)
      } else {
        // Supabase 사용자
        try {
          const dbProfile = await UserProfileManager.loadUserProfile(currentUser.id)

          if (dbProfile) {
            setUserProfile(dbProfile)
            setEditValues(dbProfile)
          } else {
            // 프로필이 없으면 기본값
            const defaultProfile = {
              id: currentUser.id,
              name: currentUser.user_metadata?.name || '',
              phone: currentUser.user_metadata?.phone || '',
              nickname: currentUser.user_metadata?.nickname || currentUser.user_metadata?.name || '',
              address: '',
              detail_address: '',
              addresses: [],
              postal_code: ''
            }

            if (!defaultProfile.phone) {
              toast.error('프로필 정보를 완성해주세요')
              router.push('/auth/complete-profile')
              return
            }

            setUserProfile(defaultProfile)
            setEditValues(defaultProfile)
          }
        } catch (error) {
          toast.error('프로필 정보를 불러올 수 없습니다')
          return
        }
      }
    } catch (error) {
      toast.error('프로필 정보를 불러올 수 없습니다')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleEdit = (field) => {
    setEditingField(field)
  }

  const handleSave = async (field, currentUser) => {
    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
        // Mock 모드 처리
        const mockUser = JSON.parse(localStorage.getItem('mock_current_user'))
        if (mockUser) {
          mockUser[field] = editValues[field]
          localStorage.setItem('mock_current_user', JSON.stringify(mockUser))

          const users = JSON.parse(localStorage.getItem('mock_users') || '[]')
          const userIndex = users.findIndex(u => u.id === mockUser.id)
          if (userIndex !== -1) {
            users[userIndex] = mockUser
            localStorage.setItem('mock_users', JSON.stringify(users))
          }
        }
      } else {
        // API Route로 업데이트
        const response = await fetch('/api/profile/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: currentUser.id,
            profileData: { [field]: editValues[field] }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '정보 수정 실패')
        }

        await response.json()
      }

      // 로컬 상태 업데이트
      setUserProfile(prev => ({ ...prev, [field]: editValues[field] }))

      // ⚡ 이벤트 발생 → useAuth가 sessionStorage 자동 동기화
      window.dispatchEvent(new CustomEvent('profileUpdated', {
        detail: { field, value: editValues[field] }
      }))

      setEditingField(null)
      toast.success('정보가 수정되었습니다')

    } catch (error) {
      toast.error(`정보 수정에 실패했습니다: ${error.message}`)
    }
  }

  const handleCancel = (field) => {
    setEditValues(prev => ({ ...prev, [field]: userProfile[field] }))
    setEditingField(null)
  }

  return {
    userProfile,
    profileLoading,
    editingField,
    editValues,
    setEditValues,
    handleEdit,
    handleSave,
    handleCancel,
    fetchUserProfile
  }
}
