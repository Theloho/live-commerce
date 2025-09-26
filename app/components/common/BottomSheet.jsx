'use client'

import { Fragment, useEffect, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion'

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = ['auto'],
  defaultSnap = 0,
  showHandle = true,
  className = '',
  ...props
}) {
  const [currentSnap, setCurrentSnap] = useState(defaultSnap)
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  // TODO: Implement multiple snap points for different heights
  // TODO: Add velocity-based closing
  // TODO: Add keyboard accessibility
  // TODO: Implement backdrop tap to close
  // TODO: Add iOS-style bounce effect

  const handleDragEnd = (event, info) => {
    const shouldClose = info.velocity.y > 500 || info.offset.y > 100
    if (shouldClose) {
      onClose()
    }
  }

  useEffect(() => {
    // Reset position when opened
    if (isOpen) {
      y.set(0)
    }
  }, [isOpen, y])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} {...props}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="fixed inset-x-0 bottom-0 max-h-full">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-300"
                enterFrom="translate-y-full"
                enterTo="translate-y-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-y-0"
                leaveTo="translate-y-full"
              >
                <Dialog.Panel
                  as={motion.div}
                  drag="y"
                  dragControls={dragControls}
                  dragConstraints={{ top: 0 }}
                  dragElastic={0.2}
                  onDragEnd={handleDragEnd}
                  style={{ y }}
                  className={`
                    relative bg-white rounded-t-2xl shadow-xl
                    max-h-[90vh] overflow-hidden flex flex-col
                    ${className}
                  `}
                >
                  {showHandle && (
                    <div
                      className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm px-6 pt-4 pb-2"
                      onPointerDown={(e) => dragControls.start(e)}
                    >
                      <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full" />
                    </div>
                  )}

                  {title && (
                    <div className="px-6 pt-2 pb-4 border-b border-gray-200">
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        {title}
                      </Dialog.Title>
                    </div>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex-1 overflow-y-auto"
                  >
                    {children}
                  </motion.div>

                  {/* Safe area for iOS devices */}
                  <div className="h-safe-area-inset-bottom bg-white" />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}