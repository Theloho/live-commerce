'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  UserIcon,
  Squares2X2Icon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuthNew'
import toast from 'react-hot-toast'

export default function SuppliersPage() {
  const router = useRouter()
  const { adminUser, isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // grid | list
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  })

  // 권한 체크
  useEffect(() => {
    if (!authLoading && !isAdminAuthenticated) {
      toast.error('관리자 로그인이 필요합니다')
      router.push('/admin/login')
    }
  }, [authLoading, isAdminAuthenticated, router])

  // 데이터 로드
  useEffect(() => {
    if (isAdminAuthenticated) {
      loadSuppliers()
    }
  }, [isAdminAuthenticated])

  const loadSuppliers = async () => {
    try {
      setLoading(true)

      if (!adminUser?.email) return

      // Service Role API로 공급업체 조회
      const response = await fetch(`/api/admin/suppliers?adminEmail=${encodeURIComponent(adminUser.email)}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '공급업체 조회 실패')
      }

      const { suppliers: suppliersData } = await response.json()
      setSuppliers(suppliersData)
      console.log('📋 공급업체 로드:', suppliersData.length)
    } catch (error) {
      console.error('공급업체 로딩 오류:', error)
      toast.error('공급업체를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 모달 열기
  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier)
      setFormData({
        name: supplier.name || '',
        code: supplier.code || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || ''
      })
    } else {
      setEditingSupplier(null)
      setFormData({
        name: '',
        code: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      })
    }
    setShowModal(true)
  }

  // 저장
  const handleSave = async () => {
    if (!formData.name) {
      toast.error('업체명을 입력해주세요')
      return
    }

    try {
      if (editingSupplier) {
        // 수정
        const response = await fetch('/api/admin/suppliers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: adminUser.email,
            id: editingSupplier.id,
            ...formData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error)
        }

        toast.success('업체 정보가 수정되었습니다')
      } else {
        // 추가
        const response = await fetch('/api/admin/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adminEmail: adminUser.email,
            ...formData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error)
        }

        toast.success('업체가 추가되었습니다')
      }

      setShowModal(false)
      loadSuppliers()
    } catch (error) {
      console.error('저장 오류:', error)
      if (error.message?.includes('duplicate') || error.message?.includes('23505')) {
        toast.error('이미 존재하는 업체 코드입니다')
      } else {
        toast.error('저장에 실패했습니다')
      }
    }
  }

  // 비활성화/활성화
  const handleToggleActive = async (supplier) => {
    try {
      const response = await fetch('/api/admin/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser.email,
          id: supplier.id,
          is_active: !supplier.is_active
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      toast.success(supplier.is_active ? '업체가 비활성화되었습니다' : '업체가 활성화되었습니다')
      loadSuppliers()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      toast.error('상태 변경에 실패했습니다')
    }
  }

  // 삭제
  const handleDelete = async (supplier) => {
    if (supplier.product_count > 0) {
      const confirm = window.confirm(
        `이 업체를 사용하는 상품이 ${supplier.product_count}개 있습니다.\n\n` +
        `삭제하면 해당 상품들의 업체 정보가 제거됩니다.\n` +
        `대신 "비활성화"를 권장합니다.\n\n` +
        `정말 삭제하시겠습니까?`
      )
      if (!confirm) return
    } else {
      const confirm = window.confirm(`${supplier.name}을(를) 삭제하시겠습니까?`)
      if (!confirm) return
    }

    try {
      const response = await fetch('/api/admin/suppliers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: adminUser.email,
          id: supplier.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      toast.success('업체가 삭제되었습니다')
      loadSuppliers()
    } catch (error) {
      console.error('삭제 오류:', error)
      toast.error('삭제에 실패했습니다')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏢 공급업체 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            총 {suppliers.length}개 업체 | 활성 {suppliers.filter(s => s.is_active).length}개
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 뷰 모드 토글 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
              title="카드 뷰"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'
              }`}
              title="리스트 뷰"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            업체 추가
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div>
        {suppliers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 업체가 없습니다</h3>
            <p className="text-gray-500 mb-6">첫 번째 공급업체를 추가해보세요</p>
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              업체 추가하기
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          // 카드 그리드 뷰
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map((supplier) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all ${
                  !supplier.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="p-4">
                  {/* 업체명 + 코드 */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                        {supplier.name}
                      </h3>
                      {!supplier.is_active && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex-shrink-0">
                          비활성
                        </span>
                      )}
                    </div>
                    {supplier.code && (
                      <p className="text-xs text-gray-500">코드: {supplier.code}</p>
                    )}
                  </div>

                  {/* 상품 수 배지 */}
                  <div className="mb-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      supplier.product_count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      📦 상품 {supplier.product_count}개
                    </span>
                  </div>

                  {/* 연락처 정보 */}
                  <div className="space-y-2 mb-3 text-sm">
                    {supplier.contact_person && (
                      <div className="flex items-center text-gray-600">
                        <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{supplier.contact_person}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center text-gray-600">
                        <PhoneIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.email && (
                      <div className="flex items-center text-gray-600">
                        <EnvelopeIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate text-xs">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start text-gray-600">
                        <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-xs line-clamp-2">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  {/* 메모 */}
                  {supplier.notes && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600 line-clamp-2">
                      {supplier.notes}
                    </div>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-300 rounded transition-colors"
                      title="삭제"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(supplier)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                      title={supplier.is_active ? '비활성화' : '활성화'}
                    >
                      <EyeSlashIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openModal(supplier)}
                      className="flex-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-300 rounded transition-colors"
                    >
                      편집
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // 리스트 뷰 (기존 테이블)
          <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    업체명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    코드
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    담당자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    연락처
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    상품 수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <motion.tr
                    key={supplier.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={supplier.is_active ? '' : 'bg-gray-50 opacity-60'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.name}
                          </div>
                          {supplier.notes && (
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {supplier.notes}
                            </div>
                          )}
                        </div>
                        {!supplier.is_active && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                            비활성
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contact_person || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.phone || '-'}</div>
                      {supplier.email && (
                        <div className="text-xs text-gray-500">{supplier.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        supplier.product_count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.product_count}개
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(supplier)}
                          className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                          title={supplier.is_active ? '비활성화' : '활성화'}
                        >
                          <EyeSlashIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal(supplier)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="수정"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingSupplier ? '업체 수정' : '업체 추가'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업체명 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="AB산업"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      업체 코드
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="비어있으면 자동 생성"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자명
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="홍길동"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="supplier@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주소
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="서울시 강남구..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    메모
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="추가 메모..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingSupplier ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
