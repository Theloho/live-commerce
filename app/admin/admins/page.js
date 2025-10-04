'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  ShieldCheckIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminsPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading, isMaster } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [admins, setAdmins] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
    if (!authLoading && isAdminAuthenticated && !isMaster) {
      toast.error('마스터 관리자만 접근 가능합니다')
      router.push('/admin')
    }
  }, [authLoading, isAdminAuthenticated, isMaster, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated && isMaster) {
      loadAdmins()
    }
  }, [isAdminAuthenticated, isMaster])

  const loadAdmins = async () => {
    try {
      setLoading(true)

      // 관리자 목록 조회 (is_admin = true 또는 is_master = true)
      const { data: adminData, error: adminError } = await supabase
        .from('profiles')
        .select('id, email, name, is_admin, is_master, created_at')
        .or('is_admin.eq.true,is_master.eq.true')
        .order('is_master', { ascending: false })
        .order('created_at', { ascending: false })

      if (adminError) throw adminError

      // 각 관리자의 권한 조회
      const adminsWithPermissions = await Promise.all(
        adminData.map(async (admin) => {
          if (admin.is_master) {
            return { ...admin, permissions: ['*'] }
          }

          const { data: permData, error: permError } = await supabase
            .from('admin_permissions')
            .select('permission')
            .eq('admin_id', admin.id)

          if (permError) throw permError

          return {
            ...admin,
            permissions: permData.map(p => p.permission)
          }
        })
      )

      setAdmins(adminsWithPermissions)
    } catch (error) {
      console.error('❌ 관리자 목록 조회 실패:', error)
      toast.error('관리자 목록을 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()

    if (!formData.email || !formData.password || !formData.name) {
      toast.error('모든 필드를 입력해주세요')
      return
    }

    try {
      // 1. Supabase Auth에 관리자 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('사용자 생성 실패')
      }

      // 2. profiles 테이블에 is_admin = true 설정
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_admin: true,
          name: formData.name
        })
        .eq('id', authData.user.id)

      if (profileError) throw profileError

      toast.success('관리자가 생성되었습니다')
      setShowCreateModal(false)
      setFormData({ email: '', password: '', name: '' })
      loadAdmins()
    } catch (error) {
      console.error('❌ 관리자 생성 실패:', error)
      toast.error(error.message || '관리자 생성에 실패했습니다')
    }
  }

  const handleDeleteAdmin = async (adminId, adminEmail) => {
    if (!window.confirm(`${adminEmail} 관리자를 삭제하시겠습니까?`)) {
      return
    }

    try {
      // is_admin을 false로 변경 (소프트 삭제)
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: false, is_master: false })
        .eq('id', adminId)

      if (error) throw error

      toast.success('관리자가 삭제되었습니다')
      loadAdmins()
    } catch (error) {
      console.error('❌ 관리자 삭제 실패:', error)
      toast.error('관리자 삭제에 실패했습니다')
    }
  }

  const openPermissionModal = (admin) => {
    setSelectedAdmin(admin)
    setShowPermissionModal(true)
  }

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">관리자 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            하위 관리자를 생성하고 권한을 부여할 수 있습니다
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          관리자 생성
        </button>
      </div>

      {/* 통계 카드 - 컴팩트 디자인 */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 flex-1 min-w-[180px]">
          <UserIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">{admins.length}</span>
            <span className="text-xs text-gray-500">전체 관리자</span>
          </div>
        </div>
        <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 flex-1 min-w-[180px]">
          <ShieldCheckIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-red-600">
              {admins.filter(a => a.is_master).length}
            </span>
            <span className="text-xs text-gray-500">마스터</span>
          </div>
        </div>
        <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3 flex-1 min-w-[180px]">
          <UserIcon className="w-6 h-6 text-blue-500 flex-shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-blue-600">
              {admins.filter(a => !a.is_master && a.is_admin).length}
            </span>
            <span className="text-xs text-gray-500">일반</span>
          </div>
        </div>
      </div>

      {/* 관리자 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  권한
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  등급
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가입일
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {admin.is_master ? (
                          <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                        <div className="text-sm text-gray-500">{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {admin.is_master ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                          모든 권한
                        </span>
                      ) : admin.permissions.length > 0 ? (
                        admin.permissions.slice(0, 3).map((perm, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">권한 없음</span>
                      )}
                      {!admin.is_master && admin.permissions.length > 3 && (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                          +{admin.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {admin.is_master ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        마스터
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        일반
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {!admin.is_master && (
                        <>
                          <button
                            onClick={() => openPermissionModal(admin)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="권한 관리"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 관리자 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">관리자 생성</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="최소 6자 이상"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({ email: '', password: '', name: '' })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  생성
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 권한 관리 모달 */}
      {showPermissionModal && selectedAdmin && (
        <PermissionModal
          admin={selectedAdmin}
          onClose={() => {
            setShowPermissionModal(false)
            setSelectedAdmin(null)
          }}
          onUpdate={() => {
            loadAdmins()
            setShowPermissionModal(false)
            setSelectedAdmin(null)
          }}
        />
      )}
    </div>
  )
}

// 권한 관리 모달 컴포넌트
function PermissionModal({ admin, onClose, onUpdate }) {
  const [permissions, setPermissions] = useState(admin.permissions || [])
  const [saving, setSaving] = useState(false)

  // 사용 가능한 권한 목록
  const availablePermissions = [
    { value: 'customers.view', label: '고객 조회' },
    { value: 'customers.edit', label: '고객 수정' },
    { value: 'customers.*', label: '고객 전체 관리' },
    { value: 'orders.view', label: '주문 조회' },
    { value: 'orders.edit', label: '주문 수정' },
    { value: 'orders.*', label: '주문 전체 관리' },
    { value: 'products.view', label: '상품 조회' },
    { value: 'products.edit', label: '상품 수정' },
    { value: 'products.*', label: '상품 전체 관리' },
    { value: 'coupons.view', label: '쿠폰 조회' },
    { value: 'coupons.edit', label: '쿠폰 수정' },
    { value: 'coupons.*', label: '쿠폰 전체 관리' },
    { value: 'settings.view', label: '설정 조회' },
    { value: 'settings.edit', label: '설정 수정' },
    { value: 'settings.*', label: '설정 전체 관리' },
  ]

  const togglePermission = (perm) => {
    if (permissions.includes(perm)) {
      setPermissions(permissions.filter(p => p !== perm))
    } else {
      setPermissions([...permissions, perm])
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // 1. 기존 권한 삭제
      const { error: deleteError } = await supabase
        .from('admin_permissions')
        .delete()
        .eq('admin_id', admin.id)

      if (deleteError) throw deleteError

      // 2. 새 권한 추가
      if (permissions.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        const grantedBy = session?.user?.id

        const permissionsToInsert = permissions.map(perm => ({
          admin_id: admin.id,
          permission: perm,
          granted_by: grantedBy
        }))

        const { error: insertError } = await supabase
          .from('admin_permissions')
          .insert(permissionsToInsert)

        if (insertError) throw insertError
      }

      toast.success('권한이 업데이트되었습니다')
      onUpdate()
    } catch (error) {
      console.error('❌ 권한 업데이트 실패:', error)
      toast.error('권한 업데이트에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          권한 관리 - {admin.name}
        </h3>
        <p className="text-sm text-gray-500 mb-6">{admin.email}</p>

        <div className="space-y-4">
          {availablePermissions.map((perm) => (
            <label
              key={perm.value}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={permissions.includes(perm.value)}
                onChange={() => togglePermission(perm.value)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">{perm.label}</div>
                <div className="text-xs text-gray-500">{perm.value}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
