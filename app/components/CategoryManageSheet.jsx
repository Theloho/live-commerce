'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function CategoryManageSheet({
  isOpen,
  onClose,
  onSelect,
  currentCategory,
  currentSubCategory,
  mode = 'main' // 'main' or 'sub'
}) {
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen, mode, currentCategory])

  const loadCategories = async () => {
    try {
      let query = supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (mode === 'main') {
        query = query.is('parent_id', null)
      } else {
        // 서브 카테고리 모드: 선택된 대분류의 서브 카테고리만
        const mainCategory = await supabase
          .from('categories')
          .select('id')
          .eq('name', currentCategory)
          .is('parent_id', null)
          .single()

        if (mainCategory.data) {
          query = query.eq('parent_id', mainCategory.data.id)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('카테고리 로딩 오류:', error)
    }
  }

  // 추가
  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('카테고리명을 입력해주세요')
      return
    }

    try {
      const slug = newName.toLowerCase().replace(/\s+/g, '-')
      let parentId = null

      if (mode === 'sub') {
        const mainCategory = await supabase
          .from('categories')
          .select('id')
          .eq('name', currentCategory)
          .is('parent_id', null)
          .single()

        if (mainCategory.data) {
          parentId = mainCategory.data.id
        }
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newName.trim(),
          slug: slug,
          parent_id: parentId,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      toast.success('카테고리가 추가되었습니다')
      setNewName('')
      setIsAdding(false)
      await loadCategories()

      // 새로 추가된 카테고리를 선택
      if (onSelect) {
        if (mode === 'main') {
          onSelect(data.name, '')
        } else {
          onSelect(currentCategory, data.name)
        }
      }
    } catch (error) {
      console.error('카테고리 추가 오류:', error)
      toast.error('카테고리 추가에 실패했습니다')
    }
  }

  // 수정
  const handleEdit = async (id) => {
    if (!editName.trim()) {
      toast.error('카테고리명을 입력해주세요')
      return
    }

    try {
      const slug = editName.toLowerCase().replace(/\s+/g, '-')
      const { error } = await supabase
        .from('categories')
        .update({ name: editName.trim(), slug: slug })
        .eq('id', id)

      if (error) throw error

      toast.success('카테고리명이 수정되었습니다')
      setEditingId(null)
      setEditName('')
      await loadCategories()
    } catch (error) {
      console.error('카테고리 수정 오류:', error)
      toast.error('카테고리 수정에 실패했습니다')
    }
  }

  // 삭제
  const handleDelete = async (category) => {
    // 상품 개수 확인
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .or(`category.eq.${category.name},sub_category.eq.${category.name}`)

    if (count > 0) {
      const confirm = window.confirm(
        `이 카테고리를 사용하는 상품이 ${count}개 있습니다.\n` +
        `삭제하면 해당 상품들의 카테고리 정보가 제거될 수 있습니다.\n` +
        `정말 삭제하시겠습니까?`
      )
      if (!confirm) return
    }

    // 서브 카테고리 확인 (대분류인 경우)
    if (!category.parent_id) {
      const { count: subCount } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('parent_id', category.id)

      if (subCount > 0) {
        toast.error(`하위 카테고리가 ${subCount}개 있습니다. 먼저 하위 카테고리를 삭제해주세요.`)
        return
      }
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id)

      if (error) throw error

      toast.success('카테고리가 삭제되었습니다')
      await loadCategories()
    } catch (error) {
      console.error('카테고리 삭제 오류:', error)
      toast.error('카테고리 삭제에 실패했습니다')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* 버텀시트 */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">
                  {mode === 'main' ? '대분류 카테고리 관리' : '소분류 카테고리 관리'}
                </h3>
                {mode === 'sub' && currentCategory && (
                  <p className="text-sm text-gray-600">대분류: {currentCategory}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* 리스트 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* 추가 버튼 또는 입력 폼 */}
              {isAdding ? (
                <div className="flex gap-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAdd()
                    }}
                    placeholder="카테고리명 입력"
                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <CheckIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsAdding(false)
                      setNewName('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span>새 {mode === 'main' ? '대분류' : '소분류'} 추가</span>
                </button>
              )}

              {/* 카테고리 리스트 */}
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`p-3 border rounded-lg ${
                    mode === 'main'
                      ? category.name === currentCategory
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                      : category.name === currentSubCategory
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  {editingId === category.id ? (
                    // 수정 모드
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEdit(category.id)
                        }}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEdit(category.id)}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditName('')
                        }}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    // 일반 모드
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (onSelect) {
                            if (mode === 'main') {
                              onSelect(category.name, '')
                            } else {
                              onSelect(currentCategory, category.name)
                            }
                          }
                          onClose()
                        }}
                        className="flex-1 text-left"
                      >
                        <p className="font-medium">
                          {category.name}
                          {mode === 'main' && category.name === currentCategory && (
                            <span className="ml-2 text-xs text-blue-600">✓ 선택됨</span>
                          )}
                          {mode === 'sub' && category.name === currentSubCategory && (
                            <span className="ml-2 text-xs text-blue-600">✓ 선택됨</span>
                          )}
                        </p>
                        {category.description && (
                          <p className="text-xs text-gray-500">{category.description}</p>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(category.id)
                            setEditName(category.name)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="수정"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="삭제"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
