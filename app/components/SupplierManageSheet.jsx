'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabase'
import { getSuppliers } from '@/lib/supabaseApi'
import toast from 'react-hot-toast'

export default function SupplierManageSheet({ isOpen, onClose, onSelect, currentSupplierId }) {
  const [suppliers, setSuppliers] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadSuppliers()
    }
  }, [isOpen])

  const loadSuppliers = async () => {
    const data = await getSuppliers()
    setSuppliers(data)
  }

  // 추가
  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error('업체명을 입력해주세요')
      return
    }

    try {
      const autoCode = `SUP${Date.now().toString().slice(-8)}`
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: newName.trim(),
          code: autoCode,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      toast.success('업체가 추가되었습니다')
      setNewName('')
      setIsAdding(false)
      await loadSuppliers()

      // 새로 추가된 업체를 선택
      if (onSelect) {
        onSelect(data.id, data.name)
      }
    } catch (error) {
      console.error('업체 추가 오류:', error)
      toast.error('업체 추가에 실패했습니다')
    }
  }

  // 수정
  const handleEdit = async (id) => {
    if (!editName.trim()) {
      toast.error('업체명을 입력해주세요')
      return
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ name: editName.trim() })
        .eq('id', id)

      if (error) throw error

      toast.success('업체명이 수정되었습니다')
      setEditingId(null)
      setEditName('')
      await loadSuppliers()
    } catch (error) {
      console.error('업체 수정 오류:', error)
      toast.error('업체 수정에 실패했습니다')
    }
  }

  // 삭제
  const handleDelete = async (supplier) => {
    // 상품 개수 확인
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id)

    if (count > 0) {
      const confirm = window.confirm(
        `이 업체를 사용하는 상품이 ${count}개 있습니다.\n` +
        `삭제하면 해당 상품들의 업체 정보가 제거됩니다.\n` +
        `대신 "비활성화"를 권장합니다.\n\n` +
        `정말 삭제하시겠습니까?`
      )
      if (!confirm) return
    }

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id)

      if (error) throw error

      toast.success('업체가 삭제되었습니다')
      await loadSuppliers()
    } catch (error) {
      console.error('업체 삭제 오류:', error)
      toast.error('업체 삭제에 실패했습니다')
    }
  }

  // 활성/비활성 토글
  const handleToggleActive = async (supplier) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: !supplier.is_active })
        .eq('id', supplier.id)

      if (error) throw error

      toast.success(supplier.is_active ? '업체를 비활성화했습니다' : '업체를 활성화했습니다')
      await loadSuppliers()
    } catch (error) {
      console.error('업체 상태 변경 오류:', error)
      toast.error('업체 상태 변경에 실패했습니다')
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
              <h3 className="text-lg font-semibold">공급업체 관리</h3>
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
                    placeholder="업체명 입력"
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
                  <span>새 업체 추가</span>
                </button>
              )}

              {/* 업체 리스트 */}
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className={`p-3 border rounded-lg ${
                    supplier.id === currentSupplierId
                      ? 'border-blue-500 bg-blue-50'
                      : supplier.is_active
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  {editingId === supplier.id ? (
                    // 수정 모드
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleEdit(supplier.id)
                        }}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => handleEdit(supplier.id)}
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
                            onSelect(supplier.id, supplier.name)
                          }
                          onClose()
                        }}
                        className="flex-1 text-left"
                      >
                        <p className={`font-medium ${!supplier.is_active ? 'text-gray-400' : ''}`}>
                          {supplier.name}
                          {supplier.id === currentSupplierId && (
                            <span className="ml-2 text-xs text-blue-600">✓ 선택됨</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{supplier.code}</p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingId(supplier.id)
                            setEditName(supplier.name)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="수정"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(supplier)}
                          className={`px-2 py-1 text-xs rounded ${
                            supplier.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                          title={supplier.is_active ? '비활성화' : '활성화'}
                        >
                          {supplier.is_active ? '활성' : '비활성'}
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
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
