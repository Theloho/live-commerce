/**
 * ProductImageUploader - 상품 이미지 업로드 컴포넌트 (Phase 4.4 리팩토링)
 * @author Claude
 * @since 2025-10-21
 *
 * Clean Architecture:
 * - Presentation Layer Component (UI만 담당)
 */

import { useRef } from 'react'
import Image from 'next/image'
import { CameraIcon, PhotoIcon } from '@heroicons/react/24/outline'

export default function ProductImageUploader({ imagePreview, onImageUpload }) {
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) onImageUpload(file)
  }

  const handleCameraCapture = (e) => {
    const file = e.target.files[0]
    if (file) onImageUpload(file)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-medium mb-4 p-6 pb-4">제품 이미지 *</h2>

      {imagePreview ? (
        <div className="space-y-4 px-6 pb-6">
          {/* 이미지 미리보기 */}
          <div className="relative aspect-[4/3] max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={imagePreview}
              alt="제품 이미지"
              fill
              className="object-cover"
            />
          </div>

          {/* 이미지 변경 버튼들 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PhotoIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">사진보관함</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CameraIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">사진촬영</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          {/* 업로드 옵션 버튼들 */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
            >
              <PhotoIcon className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-green-700">사진보관함</span>
            </button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 py-4 px-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <CameraIcon className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">사진촬영</span>
            </button>
          </div>
        </div>
      )}

      {/* 숨겨진 input 요소들 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraCapture}
        className="hidden"
      />
    </div>
  )
}
