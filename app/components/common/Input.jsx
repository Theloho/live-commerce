'use client'

import { forwardRef, useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const Input = forwardRef(({
  label,
  type = 'text',
  error,
  helper,
  icon,
  required = false,
  disabled = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPasswordField = type === 'password'

  const baseStyles = 'w-full px-4 py-3 rounded-lg border bg-white text-gray-900 placeholder-gray-400 transition-all duration-200'

  const stateStyles = error
    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200'
    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'

  const disabledStyles = disabled ? 'bg-gray-50 cursor-not-allowed opacity-60' : ''

  // TODO: Add auto-complete suggestions for common fields
  // TODO: Implement input masking for phone/credit card
  // TODO: Add character counter for textarea
  // TODO: Add voice input support for mobile

  return (
    <div className={`relative ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}

        <input
          ref={ref}
          type={isPasswordField && showPassword ? 'text' : type}
          className={`
            ${baseStyles}
            ${stateStyles}
            ${disabledStyles}
            ${icon ? 'pl-10' : ''}
            ${isPasswordField ? 'pr-12' : ''}
            ${className}
          `}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : helper ? `${props.id}-helper` : undefined}
          {...props}
        />

        {isPasswordField && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={`${props.id}-error`} className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {helper && !error && (
        <p id={`${props.id}-helper`} className="mt-2 text-sm text-gray-500">
          {helper}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export default Input