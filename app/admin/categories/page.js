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
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function CategoriesPage() {
  const router = useRouter()
  const { isAdminAuthenticated, loading: authLoading } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    parent_id: '',
    description: ''
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
      loadCategories()
    }
  }, [isAdminAuthenticated])

  const loadCategories = async () => {
    try {
      setLoading(true)

      // 모든 카테고리 로드
      const { data: categoriesData, error } = await supabase
        .from('categories')
        .select('*')
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('name', { ascending: true })

      if (error) throw error

      // 각 카테고리의 상품 개수 가져오기
      const categoriesWithCount = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count, error: countError } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', category.id)

          return {
            ...category,
            product_count: countError ? 0 : (count || 0)
          }
        })
      )

      setCategories(categoriesWithCount)
      console.log('📋 카테고리 로드:', categoriesWithCount.length)
    } catch (error) {
      console.error('카테고리 로딩 오류:', error)
      toast.error('카테고리를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 모달 열기
  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        parent_id: category.parent_id || '',
        description: category.description || ''
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        parent_id: '',
        description: ''
      })
    }
    setShowModal(true)
  }

  // 저장
  const handleSave = async () => {
    if (!formData.name) {
      toast.error('카테고리명을 입력해주세요')
      return
    }

    try {
      // slug 자동 생성 (입력 안 했을 경우)
      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')

      if (editingCategory) {
        // 수정
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            slug: slug,
            parent_id: formData.parent_id || null,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        toast.success('카테고리가 수정되었습니다')
      } else {
        // 추가
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            slug: slug,
            parent_id: formData.parent_id || null,
            description: formData.description,
            is_active: true
          })

        if (error) throw error
        toast.success('카테고리가 추가되었습니다')
      }

      setShowModal(false)
      loadCategories()
    } catch (error) {
      console.error('저장 오류:', error)
      if (error.code === '23505') {
        toast.error('이미 존재하는 slug입니다')
      } else {
        toast.error('저장에 실패했습니다')
      }
    }
  }

  // 비활성화/활성화
  const handleToggleActive = async (category) => {
    try {
      const { error } = await supabase
        .from('categories')
        .update({
          is_active: !category.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', category.id)

      if (error) throw error

      toast.success(category.is_active ? '카테고리가 비활성화되었습니다' : '카테고리가 활성화되었습니다')
      loadCategories()
    } catch (error) {
      console.error('상태 변경 오류:', error)
      toast.error('상태 변경에 실패했습니다')
    }
  }

  // 삭제
  const handleDelete = async (category) => {
    if (category.product_count > 0) {
      const confirm = window.confirm(
        `이 카테고리를 사용하는 상품이 ${category.product_count}개 있습니다.\n\n` +
        `삭제하면 해당 상품들의 카테고리 정보가 제거됩니다.\n` +
        `대신 "비활성화"를 권장합니다.\n\n` +
        `정말 삭제하시겠습니까?`
      )
      if (!confirm) return
    } else {
      const confirm = window.confirm(`${category.name}을(를) 삭제하시겠습니까?`)
      if (!confirm) return
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      toast.success('카테고리가 삭제되었습니다')
      loadCategories()
    } catch (error) {
      console.error('삭제 오류:', error)
      toast.error('삭제에 실패했습니다')
    }
  }

  // 대분류 카테고리만 필터
  const mainCategories = categories.filter(c => !c.parent_id)
  // 소분류 카테고리만 필터
  const subCategories = categories.filter(c => c.parent_id)

  // 카테고리 이름 찾기
  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id)
    return cat ? cat.name : '-'
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
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto py-4 px-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">카테고리 관리</h1>
            <p className="text-sm text-gray-600 mt-1">
              대분류 {mainCategories.length}개 | 소분류 {subCategories.length}개 |
              활성 {categories.filter(c => c.is_active).length}개
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            카테고리 추가
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto py-6 px-6">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  카테고리명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  상위 카테고리
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  상품 수
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  상태
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <motion.tr
                  key={category.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={category.is_active ? '' : 'bg-gray-50 opacity-60'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {category.parent_id && (
                        <ChevronRightIcon className="w-4 h-4 text-gray-400 mr-2" />
                      )}
                      <div>
                        <div className={`text-sm font-medium text-gray-900 ${!category.parent_id ? 'font-bold' : ''}`}>
                          {category.name}
                        </div>
                        {category.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.parent_id ? getCategoryName(category.parent_id) : '대분류'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.product_count > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {category.product_count}개
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {category.is_active ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        <XCircleIcon className="w-3 h-3 mr-1" />
                        비활성
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(category)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="수정"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(category)}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded"
                        title={category.is_active ? '비활성화' : '활성화'}
                      >
                        <EyeSlashIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 카테고리가 없습니다</h3>
              <p className="text-gray-500 mb-6">초기 카테고리 데이터를 마이그레이션 하세요</p>
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                카테고리 추가하기
              </button>
            </div>
          )}
        </div>
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
                {editingCategory ? '카테고리 수정' : '카테고리 추가'}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      카테고리명 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="아동화"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="비어있으면 자동 생성"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상위 카테고리 (소분류인 경우)
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">대분류 (상위 없음)</option>
                    {mainCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="카테고리 설명..."
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
                  {editingCategory ? '수정' : '추가'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
