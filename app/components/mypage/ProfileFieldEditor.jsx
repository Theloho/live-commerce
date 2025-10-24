/**
 * ProfileFieldEditor - 프로필 필드 편집 UI
 * @author Claude
 * @since 2025-10-24
 *
 * Presentation Layer: UI만 (비즈니스 로직 없음)
 */

'use client'

import { motion } from 'framer-motion'
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'

export default function ProfileFieldEditor({
  profileFields,
  userProfile,
  editingField,
  editValues,
  onEdit,
  onSave,
  onCancel,
  setEditValues
}) {
  if (!userProfile) return null

  return (
    <div className="bg-white mt-2">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
      </div>
      <div className="divide-y divide-gray-200">
        {profileFields.map((field) => {
          const IconComponent = field.icon
          const isEditing = editingField === field.key
          const value = userProfile[field.key] || ''

          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <IconComponent className="h-5 w-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type={field.type}
                          value={editValues[field.key] || ''}
                          onChange={(e) => setEditValues(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
                          placeholder={field.label}
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() => onSave(field.key)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                          >
                            <CheckIcon className="h-4 w-4" />
                            저장
                          </button>
                          <button
                            onClick={() => onCancel(field.key)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 text-sm">
                          {value || '설정되지 않음'}
                        </p>
                        {!field.readonly && (
                          <button
                            onClick={() => onEdit(field.key)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="수정"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {field.readonly && (
                          <p className="text-xs text-gray-500">수정불가</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
